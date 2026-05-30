"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../arbeitsauftrag-form.css";
import AppPageShell from "./AppPageShell";
import ArbeitsauftragPrintDocument from "./ArbeitsauftragPrintDocument";
import ArbeitsauftragPrintPreview from "./ArbeitsauftragPrintPreview";
import ArbeitsauftragWorksheetMachineBlock, {
  type ArbeitsauftragWorksheetMachineBlockHandle,
} from "./ArbeitsauftragWorksheetMachineBlock";
import ArbeitsauftragProtokollSection from "./ArbeitsauftragProtokollSection";
import {
  buildStammdatenPatch,
  fetchMachineById,
  formatValue,
  machineToStammdatenFields,
  updateMachine,
  type StammdatenField,
} from "../../lib/machines";
import {
  collectCheckedRepairLabels,
  issueProtocolStockDelta,
  linkProtocolToLager,
} from "../../lib/arbeitsauftrag-protokoll";
import { reserveWorkOrderAuftragNr } from "../../lib/auftrag-nr";
import { fetchLagerTeile } from "../../lib/lager";
import {
  createEmptyWorkOrder,
  formatOrderType,
  formatWorkOrderAuftragNr,
  getWorkOrders,
  mergeWorkOrder,
  normalizeWorkOrder,
  type WorkOrder,
} from "../../lib/work-orders";
import type { Machine } from "../../lib/types/machine";

type Props = {
  machineId: string;
  auftragId?: string | null;
  initialType?: string | null;
  autoPrint?: boolean;
  /** Bestehender Auftrag: true = volles Bearbeiten-Formular */
  editMode?: boolean;
};

export default function ArbeitsauftragForm({
  machineId,
  auftragId,
  initialType,
  autoPrint = false,
  editMode = false,
}: Props) {
  const router = useRouter();
  const stammdatenRef = useRef<ArbeitsauftragWorksheetMachineBlockHandle>(null);
  const printedRef = useRef(false);
  const [machine, setMachine] = useState<Machine | null>(null);
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [canWrite, setCanWrite] = useState(false);
  const [canIssueLager, setCanIssueLager] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [previewFields, setPreviewFields] = useState<StammdatenField[]>([]);

  const isNew = !auftragId && Boolean(initialType?.trim());
  const isViewMode = Boolean(auftragId) && !isNew && !editMode;

  const viewHref = `/arbeitsauftrag?machineId=${encodeURIComponent(machineId)}&auftragId=${encodeURIComponent(auftragId ?? "")}`;
  const editHref = `${viewHref}&edit=1`;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const sessionRes = await fetch("/api/auth/session", {
      cache: "no-store",
      credentials: "include",
    });
    const session = await sessionRes.json().catch(() => ({}));
    const name = session.user?.username ?? session.username ?? "";
    const perms: string[] = session.permissions ?? [];
    const groups: string[] = session.groups ?? [];
    const isAdmin =
      name.trim().toLowerCase() === "admin" || groups.includes("Admin");
    const canMachineWrite = perms.includes("machines.write") || isAdmin;
    const isTechniker = groups.includes("Techniker");

    setUsername(name);
    setCanWrite(canMachineWrite || isTechniker);
    setCanIssueLager(
      isAdmin ||
        perms.includes("warehouse.issue") ||
        perms.includes("warehouse.write") ||
        canMachineWrite ||
        isTechniker
    );

    const { data, error: loadError } = await fetchMachineById(machineId);
    if (loadError || !data) {
      setError(loadError?.message ?? "Maschine nicht gefunden.");
      setMachine(null);
      setOrder(null);
      setLoading(false);
      return;
    }

    setMachine(data);
    const orders = getWorkOrders(data);
    const existing = auftragId ? orders.find((item) => item.id === auftragId) : null;

    if (auftragId && !existing) {
      setError("Arbeitsauftrag nicht gefunden. Bitte aus der Liste erneut öffnen.");
      setOrder(null);
      setLoading(false);
      return;
    }

    if (existing) {
      setOrder(normalizeWorkOrder(existing));
    } else if (initialType?.trim()) {
      const empty = createEmptyWorkOrder({
        type: initialType,
        depot: data.depot ?? "",
        username: name,
      });
      try {
        const { auftragNr } = await reserveWorkOrderAuftragNr({
          type: empty.type,
          depot: empty.depot || data.depot || "",
          date: empty.date,
        });
        setOrder({ ...empty, auftragNr });
      } catch {
        setOrder(empty);
      }
    } else {
      setError("Ungültiger Link. Bitte Arbeitsauftrag aus der Liste wählen.");
      setOrder(null);
    }

    setLoading(false);
  }, [auftragId, initialType, machineId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoPrint || printedRef.current || loading || !machine || !order) return;
    printedRef.current = true;
    window.setTimeout(() => {
      window.print();
    }, 200);
  }, [autoPrint, loading, machine, order]);

  const printFields = useMemo(
    () => machineToStammdatenFields(machine),
    [machine]
  );

  const checkedRepairLabels = useMemo(
    () => (order ? collectCheckedRepairLabels(order.protocol) : []),
    [order]
  );

  const title = useMemo(() => {
    if (!machine) return "Arbeitsauftrag";
    const typeLabel = order ? formatOrderType(order.type) : "";
    const nr = order ? formatWorkOrderAuftragNr(order) : "";
    const nrPart = nr && nr !== "—" ? ` · ${nr}` : "";
    return `${formatValue(machine.geraetenummer)} — Arbeitsauftrag${typeLabel ? ` (${typeLabel})` : ""}${nrPart}`;
  }, [machine, order]);

  function updateOrder(patch: Partial<WorkOrder>) {
    setOrder((current) => (current ? { ...current, ...patch } : current));
  }

  async function persistOrder(
    fields: StammdatenField[],
    orderToSave: WorkOrder
  ): Promise<boolean> {
    if (!machine || !canWrite) {
      setSaveError("Keine Berechtigung: machines.write erforderlich.");
      return false;
    }

    setSaving(true);
    setSaveError(null);
    setMessage(null);

    let normalized = normalizeWorkOrder(orderToSave);

    if (!normalized.auftragNr?.trim()) {
      try {
        const { auftragNr } = await reserveWorkOrderAuftragNr({
          type: normalized.type,
          depot: normalized.depot || machine.depot || "",
          date: normalized.date,
        });
        normalized = { ...normalized, auftragNr };
      } catch (reserveError) {
        setSaveError(
          reserveError instanceof Error
            ? reserveError.message
            : "Auftrag-Nr. konnte nicht erzeugt werden."
        );
        setSaving(false);
        return false;
      }
    }

    const { data: lagerTeile } = await fetchLagerTeile();
    if (lagerTeile?.length) {
      normalized = {
        ...normalized,
        protocol: linkProtocolToLager(normalized.protocol, lagerTeile),
      };
    }

    if (canIssueLager) {
      const { protocol: issuedProtocol, error: issueErr, issuedCount } =
        await issueProtocolStockDelta(
          machine.id,
          normalized.protocol,
          `Arbeitsauftrag ${normalized.id}`
        );
      if (issueErr) {
        setSaveError(issueErr.message);
        setSaving(false);
        return false;
      }
      normalized = { ...normalized, protocol: issuedProtocol };
      if (issuedCount > 0) {
        setMessage(`${issuedCount} Lagerposition(en) ausgebucht.`);
      }
    }

    const patch = buildStammdatenPatch(machine, fields);
    patch.machine_tab_data = mergeWorkOrder(machine, normalized, username);

    const { data, error: saveErr } = await updateMachine(machine.id, patch);
    if (saveErr) {
      setSaveError(saveErr.message);
      setSaving(false);
      return false;
    }

    if (data) {
      setMachine(data);
      const savedOrders = getWorkOrders(data);
      const savedOrder =
        savedOrders.find((item) => item.id === orderToSave.id) ?? orderToSave;
      setOrder(savedOrder);
      setMessage("Arbeitsauftrag gespeichert.");

      if (isNew) {
        router.replace(
          `/arbeitsauftrag?machineId=${data.id}&auftragId=${encodeURIComponent(orderToSave.id)}`
        );
      }
    }

    setSaving(false);
    return true;
  }

  async function handleSaveAll() {
    if (!order) return;
    const fields = stammdatenRef.current?.getFields() ?? machineToStammdatenFields(machine);
    const ok = await persistOrder(fields, order);
    if (ok) {
      if (isNew) {
        return;
      }
      router.replace(viewHref);
    }
  }

  function openPrintPreview() {
    setPreviewFields(stammdatenRef.current?.getFields() ?? printFields);
    setPrintPreviewOpen(true);
  }

  function fieldsForPrint() {
    return previewFields.length > 0
      ? previewFields
      : stammdatenRef.current?.getFields() ?? printFields;
  }

  return (
    <AppPageShell
      activeHref="/arbeitsauftrag"
      mainClassName="protocolShell"
      contentClassName="protocolPage"
      top={
        <div className="detailTopBar arbeitsauftragHideOnPrint">
          <h1>{title}</h1>
          <div className="detailTopActions">
            <Link className="pillButton outline" href={`/maschinen/${machineId}`}>
              Maschine
            </Link>
            {machine && order ? (
              <>
                <button
                  type="button"
                  className="pillButton outline"
                  onClick={openPrintPreview}
                >
                  Druckvorschau
                </button>
                <button
                  type="button"
                  className="pillButton outline"
                  onClick={() => window.print()}
                >
                  Drucken
                </button>
              </>
            ) : null}
            {isViewMode && canWrite ? (
              <Link className="pillButton primary" href={editHref}>
                Bearbeiten
              </Link>
            ) : null}
            {!isViewMode && auftragId && !isNew ? (
              <Link className="pillButton outline" href={viewHref}>
                Arbeitsblatt
              </Link>
            ) : null}
            {!isViewMode && canWrite ? (
              <button
                type="button"
                className="pillButton primary"
                onClick={handleSaveAll}
                disabled={saving || !order}
              >
                {saving ? "Speichern…" : "Speichern"}
              </button>
            ) : null}
          </div>
        </div>
      }
    >
        {loading ? (
          <div className="welcomeCard arbeitsauftragHideOnPrint">
            <h2>Laden…</h2>
          </div>
        ) : error ? (
          <div className="welcomeCard arbeitsauftragHideOnPrint">
            <h2>Fehler</h2>
            <p>{error}</p>
          </div>
        ) : machine && order ? (
          <>
            {isViewMode ? (
              <div className="arbeitsauftragWorksheetView arbeitsauftragPrintSource">
                <ArbeitsauftragPrintDocument
                  machine={machine}
                  order={order}
                  stammdatenFields={printFields}
                  username={username}
                />
              </div>
            ) : null}

            <div
              className={`aaForm arbeitsauftragHideOnPrint${isViewMode ? " arbeitsauftragEditFormHidden" : ""}`}
            >
              {isNew ? (
                <p className="subtitle aaNewAuftragHint" style={{ marginBottom: 12 }}>
                  Neuer Auftrag: {formatOrderType(order.type)}
                  {order.auftragNr?.trim() ? (
                    <>
                      {" "}
                      · Auftrag-Nr.{" "}
                      <strong className="aaAuftragNr">{order.auftragNr}</strong>
                    </>
                  ) : (
                    " · Auftrag-Nr. wird vergeben…"
                  )}
                </p>
              ) : null}
              <ArbeitsauftragWorksheetMachineBlock
                ref={stammdatenRef}
                machine={machine}
                order={order}
                username={username}
                editable
                showAllFields
                canWrite={canWrite}
                className="arbeitsauftragHideOnPrint"
              />
              {saveError ? (
                <p className="arbeitsauftragHideOnPrint" style={{ color: "#dc2626" }}>
                  {saveError}
                </p>
              ) : null}

              <section className="protocolSection card aaBlock">
                <ArbeitsauftragProtokollSection
                  protocol={order.protocol}
                  canEdit={canWrite}
                  canIssueLager={canIssueLager}
                  machineId={machineId}
                  auftragReferenz={`Arbeitsauftrag ${formatWorkOrderAuftragNr(order)}`}
                  onChange={(protocol) => updateOrder({ protocol })}
                />
              </section>

              <section className="protocolSection card aaBlock">
                <label className="protocolField textAreas">
                  <span>Bemerkung:</span>
                  {checkedRepairLabels.length > 0 ? (
                    <div className="aaBemerkungCheckSummary" aria-live="polite">
                      <ul className="aaBemerkungCheckSummaryList">
                        {checkedRepairLabels.map((label) => (
                          <li key={label}>{label}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <textarea
                    rows={6}
                    value={order.notes}
                    readOnly={!canWrite}
                    placeholder="Zusätzliche Bemerkung…"
                    onChange={(e) => updateOrder({ notes: e.target.value })}
                  />
                </label>
                <label className="protocolField" style={{ marginTop: 12 }}>
                  <span>Arbeitsstunden</span>
                  <input
                    type="text"
                    value={order.workHours ?? ""}
                    readOnly={!canWrite}
                    placeholder="z. B. 2,5"
                    onChange={(e) => updateOrder({ workHours: e.target.value })}
                  />
                </label>
              </section>

              {!canWrite ? (
                <p className="scanHint">Keine Berechtigung: machines.write erforderlich.</p>
              ) : null}
              {message ? <p className="protocolNotice success">{message}</p> : null}
            </div>

            {!isViewMode ? (
              <div className="arbeitsauftragPrintOnly arbeitsauftragPrintSource" aria-hidden>
                <ArbeitsauftragPrintDocument
                  machine={machine}
                  order={order}
                  stammdatenFields={fieldsForPrint()}
                  username={username}
                />
              </div>
            ) : null}

            <ArbeitsauftragPrintPreview
              open={printPreviewOpen}
              onClose={() => setPrintPreviewOpen(false)}
              machine={machine}
              order={order}
              stammdatenFields={fieldsForPrint()}
              username={username}
            />
          </>
        ) : null}
    </AppPageShell>
  );
}
