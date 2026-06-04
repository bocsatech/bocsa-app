"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../arbeitsauftrag-form.css";
import AppPageShell from "./AppPageShell";
import ArbeitsauftragPrintDocument from "./ArbeitsauftragPrintDocument";
import ArbeitsauftragPrintPreview from "./ArbeitsauftragPrintPreview";
import type { SessionAuthSlice } from "../../lib/machine-permissions";
import type { ArbeitsauftragWorksheetMachineBlockHandle } from "./ArbeitsauftragWorksheetMachineBlock";
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
  buildArbeitsauftragDetailHref,
  navigateToArbeitsauftragList,
} from "../../lib/arbeitsauftrag-routes";
import {
  collectBemerkungLines,
  issueProtocolStockDelta,
  linkProtocolToLager,
  stripLegacyAutofillProtocol,
  type WorkOrderProtocol,
} from "../../lib/arbeitsauftrag-protokoll";
import {
  cloneProtocolFromVorlage,
  fetchGruppenProtokollVorlage,
  fetchProtocolForNewWorkOrder,
  machineHasEigenProtokollVorlage,
  normalizeSubgroupKey,
  readMachineEigenVorlage,
  resolveProtocolForMachine,
  saveMachineProtokollVorlage,
  clearMachineProtokollVorlageApi,
} from "../../lib/geraetgruppe-protokoll";
import { reserveWorkOrderAuftragNr } from "../../lib/auftrag-nr";
import type { UserFilialeCode } from "../../lib/user-filiale";
import { normalizeUserFilialeCode } from "../../lib/user-filiale";
import { fetchLagerTeile } from "../../lib/lager";
import {
  createEmptyWorkOrder,
  findWorkOrderByAuftragNr,
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
  /** Aus Lagerbewegungen: Auftrag-Nr. statt UUID */
  initialAuftragNr?: string | null;
  initialType?: string | null;
  autoPrint?: boolean;
  /** Bestehender Auftrag: true = volles Bearbeiten-Formular */
  editMode?: boolean;
};

export default function ArbeitsauftragForm({
  machineId,
  auftragId,
  initialAuftragNr,
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
  const [filialeCode, setFilialeCode] = useState<UserFilialeCode | "">("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [sessionAuth, setSessionAuth] = useState<SessionAuthSlice>({
    permissions: [],
    groups: [],
  });
  const [canIssueLager, setCanIssueLager] = useState(false);
  const [printPreviewOpen, setPrintPreviewOpen] = useState(false);
  const [previewFields, setPreviewFields] = useState<StammdatenField[]>([]);
  const [vorlageSaving, setVorlageSaving] = useState(false);

  const isNew = !auftragId && Boolean(initialType?.trim());
  const isViewMode =
    Boolean(auftragId || initialAuftragNr?.trim()) && !isNew && !editMode;

  const viewHref = buildArbeitsauftragDetailHref({
    machineId,
    auftragId,
  });
  const editHref = buildArbeitsauftragDetailHref({
    machineId,
    auftragId,
    edit: true,
  });

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
    setFilialeCode(normalizeUserFilialeCode(session.profile?.filialeCode) ?? "");
    setIsAdmin(isAdmin);
    setSessionAuth({ permissions: perms, groups, username: name });
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
    const nrQuery = initialAuftragNr?.trim();
    const existing = auftragId
      ? orders.find((item) => item.id === auftragId)
      : nrQuery
        ? findWorkOrderByAuftragNr(orders, nrQuery)
        : null;

    if ((auftragId || nrQuery) && !existing) {
      setError("Arbeitsauftrag nicht gefunden. Bitte aus der Liste erneut öffnen.");
      setOrder(null);
      setLoading(false);
      return;
    }

    if (existing) {
      let normalized = normalizeWorkOrder(existing);
      const eigen = readMachineEigenVorlage(data);
      const stripped = stripLegacyAutofillProtocol(normalized.protocol);
      const protocolEmpty =
        stripped.serviceSchedule.length === 0 && stripped.repairGroups.length === 0;
      if (eigen && protocolEmpty) {
        normalized = {
          ...normalized,
          protocol: cloneProtocolFromVorlage(eigen),
          protocolSource: "eigen",
          protocolSubgroup:
            normalizeSubgroupKey(data.subgroup) || normalized.protocolSubgroup,
        };
      } else if (
        stripped.serviceSchedule.length !== normalized.protocol.serviceSchedule.length
      ) {
        normalized = { ...normalized, protocol: stripped };
      }
      setOrder(normalized);
    } else if (initialType?.trim()) {
      const resolved = await fetchProtocolForNewWorkOrder(data);
      const empty = createEmptyWorkOrder({
        type: initialType,
        depot: data.depot ?? "",
        username: name,
        protocol: resolved.protocol,
        protocolSource: resolved.source,
        protocolSubgroup: resolved.subgroup,
      });
      try {
        const { auftragNr } = await reserveWorkOrderAuftragNr({
          type: empty.type,
          geraetenummer: data.geraetenummer ?? "",
          filialeCode: normalizeUserFilialeCode(session.profile?.filialeCode) ?? "",
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
  }, [auftragId, initialAuftragNr, initialType, machineId]);

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

  const bemerkungLines = useMemo(
    () => (order ? collectBemerkungLines(order.protocol) : []),
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

  function updateProtocol(next: WorkOrderProtocol) {
    setOrder((current) => {
      if (!current) return current;
      const protocolSource =
        current.protocolSource === "gruppe" ? "eigen" : current.protocolSource;
      return { ...current, protocol: next, protocolSource };
    });
  }

  async function reloadGruppenVorlage() {
    if (!machine || !order) return;
    const subgroup = normalizeSubgroupKey(machine.subgroup);
    if (!subgroup) {
      setMessage("Keine Gerätegruppe an der Maschine — Vorlage ALLGEMEIN oder Stammdaten prüfen.");
      return;
    }
    if (
      !window.confirm(
        `Protokoll-Struktur aus Gerätegruppe „${subgroup}" laden? Angehakte Zeilen und Mengen gehen verloren.`
      )
    ) {
      return;
    }
    const { data, error } = await fetchGruppenProtokollVorlage(subgroup);
    if (error || !data?.vorlage) {
      setSaveError(error?.message ?? "Gruppen-Vorlage nicht gefunden.");
      return;
    }
    const resolved = resolveProtocolForMachine(machine, data.vorlage);
    updateOrder({
      protocol: resolved.protocol,
      protocolSource: "gruppe",
      protocolSubgroup: subgroup,
    });
    setMessage(`Protokoll aus Gerätegruppe ${subgroup} geladen.`);
  }

  async function saveMachineEigenVorlage() {
    if (!machine || !order) {
      setSaveError("Maschine oder Auftrag nicht geladen.");
      return;
    }
    if (!canWrite) {
      setSaveError("Keine Berechtigung: machines.write erforderlich.");
      return;
    }

    setVorlageSaving(true);
    setSaveError(null);
    setMessage(null);

    const { ok, error } = await saveMachineProtokollVorlage(machine.id, order.protocol);
    if (!ok) {
      setVorlageSaving(false);
      setSaveError(error ?? "Maschinen-Vorlage konnte nicht gespeichert werden.");
      return;
    }

    const { data: reloaded } = await fetchMachineById(machine.id);
    if (!reloaded) {
      setVorlageSaving(false);
      setSaveError("Maschine nach Speichern nicht geladen.");
      return;
    }

    const orderToPersist: WorkOrder = {
      ...order,
      protocolSource: "eigen",
      protocolSubgroup: normalizeSubgroupKey(reloaded.subgroup) || order.protocolSubgroup,
    };
    setMachine(reloaded);
    updateOrder(orderToPersist);

    const fields =
      stammdatenRef.current?.getFields() ?? machineToStammdatenFields(reloaded);
    const persisted = await persistOrder(fields, orderToPersist, {
      skipNavigate: true,
      silentMessage: true,
      machineOverride: reloaded,
      skipLagerProcessing: true,
    });
    setVorlageSaving(false);

    if (!persisted) {
      setSaveError(
        (prev) =>
          prev ??
          "Vorlage gespeichert, aber Auftrag konnte nicht mitgespeichert werden — bitte Speichern klicken."
      );
      return;
    }

    setMessage("Maschinen-Vorlage und Auftrag gespeichert.");
  }

  async function clearMachineEigenVorlage() {
    if (!machine) {
      setSaveError("Maschine nicht geladen.");
      return;
    }
    if (!canWrite) {
      setSaveError("Keine Berechtigung: machines.write erforderlich.");
      return;
    }

    setVorlageSaving(true);
    setSaveError(null);
    setMessage(null);

    const { ok, error } = await clearMachineProtokollVorlageApi(machine.id);
    setVorlageSaving(false);

    if (!ok) {
      setSaveError(error ?? "Maschinen-Vorlage konnte nicht entfernt werden.");
      return;
    }

    const { data: reloaded } = await fetchMachineById(machine.id);
    if (reloaded) setMachine(reloaded);
    if (order) {
      updateOrder({ protocolSource: "gruppe" });
    }
    setMessage("Maschinen-Vorlage deaktiviert — künftig wieder Gerätegruppe.");
  }

  async function persistOrder(
    fields: StammdatenField[],
    orderToSave: WorkOrder,
    options?: {
      skipNavigate?: boolean;
      silentMessage?: boolean;
      /** Nach Maschinen-Vorlage-Speichern: frische machine_tab_data inkl. Vorlage */
      machineOverride?: Machine;
      skipLagerProcessing?: boolean;
    }
  ): Promise<boolean> {
    const baseMachine = options?.machineOverride ?? machine;
    if (!baseMachine || !canWrite) {
      setSaveError("Keine Berechtigung: machines.write erforderlich.");
      return false;
    }

    setSaving(true);
    setSaveError(null);
    if (!options?.silentMessage) {
      setMessage(null);
    }

    let normalized = normalizeWorkOrder(orderToSave);

    if (!normalized.auftragNr?.trim()) {
      try {
        const { auftragNr } = await reserveWorkOrderAuftragNr({
          type: normalized.type,
          geraetenummer: baseMachine.geraetenummer ?? "",
          filialeCode: filialeCode || "",
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

    if (!options?.skipLagerProcessing) {
      const { data: lagerTeile } = await fetchLagerTeile();
      if (lagerTeile?.length) {
        normalized = {
          ...normalized,
          protocol: linkProtocolToLager(normalized.protocol, lagerTeile),
        };
      }

      if (canIssueLager) {
        const { protocol: issuedProtocol, error: issueErr, issuedCount } =
          await issueProtocolStockDelta(normalized.protocol, `Arbeitsauftrag ${formatWorkOrderAuftragNr(normalized)}`, {
            machineId: baseMachine.id,
          });
        if (issueErr) {
          setSaveError(issueErr.message);
          setSaving(false);
          return false;
        }
        normalized = { ...normalized, protocol: issuedProtocol };
        if (issuedCount > 0 && !options?.silentMessage) {
          setMessage(`${issuedCount} Lagerposition(en) ausgebucht.`);
        }
      }
    }

    const patch = buildStammdatenPatch(baseMachine, fields);
    patch.machine_tab_data = mergeWorkOrder(baseMachine, normalized, username);

    const { data, error: saveErr } = await updateMachine(baseMachine.id, patch);
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
      if (!options?.silentMessage) {
        setMessage("Arbeitsauftrag gespeichert.");
      }

      if (isNew && !options?.skipNavigate) {
        router.replace(
          buildArbeitsauftragDetailHref({
            machineId: data.id,
            auftragId: orderToSave.id,
          })
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

  async function handleDeleteAuftrag() {
    if (!machine || !order || isNew) return;
    const nr = formatWorkOrderAuftragNr(order);
    const confirmed = window.confirm(
      `Auftrag „${nr}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`
    );
    if (!confirmed) return;

    setSaving(true);
    setSaveError(null);
    const response = await fetch(
      `/api/machines/${machine.id}/work-orders/${order.id}`,
      { method: "DELETE", credentials: "include" }
    );
    const result = await response.json().catch(() => ({}));
    setSaving(false);

    if (!response.ok) {
      setSaveError(result.error ?? "Auftrag konnte nicht gelöscht werden.");
      return;
    }

    navigateToArbeitsauftragList(router);
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
      contentClassName="protocolPage machineDetailPage"
      top={
        <div className="detailTopBar arbeitsauftragHideOnPrint">
          <h1>{title}</h1>
          <div className="detailTopActions">
            <button
              type="button"
              className="pillButton outline"
              onClick={() => navigateToArbeitsauftragList(router)}
            >
              Zur Liste
            </button>
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
            {isAdmin && order && !isNew ? (
              <button
                type="button"
                className="pillButton outline"
                onClick={handleDeleteAuftrag}
                disabled={saving}
              >
                Löschen
              </button>
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
            <div
              className={`arbeitsauftragWorksheetView${isViewMode ? " arbeitsauftragPrintSource" : ""}`}
            >
              <ArbeitsauftragPrintDocument
                ref={stammdatenRef}
                machine={machine}
                order={order}
                stammdatenFields={printFields}
                username={username}
                editable={!isViewMode}
                canWrite={canWrite}
                sessionAuth={sessionAuth}
                machineBlockOnly={!isViewMode}
              />
            </div>

            {!isViewMode ? (
            <div className="aaForm arbeitsauftragHideOnPrint">
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
              {saveError ? (
                <p style={{ color: "#dc2626" }}>{saveError}</p>
              ) : null}

              <section className="protocolSection card aaBlock">
                <div className="aaProtokollVorlageBar">
                  <p className="aaProtokollVorlageHint">
                    Gerätegruppe:{" "}
                    <strong>{machine.subgroup?.trim() || "—"}</strong>
                    {order.protocolSource === "gruppe"
                      ? " · Struktur aus Gruppen-Vorlage"
                      : order.protocolSource === "eigen"
                        ? machineHasEigenProtokollVorlage(machine)
                          ? " · Eigene Maschinen-Vorlage"
                          : " · Individuell angepasst"
                        : machineHasEigenProtokollVorlage(machine)
                          ? " · Eigene Maschinen-Vorlage"
                          : " · Standard-Vorlage"}
                  </p>
                  {canWrite ? (
                    <div className="aaProtokollVorlageActions">
                      <button
                        type="button"
                        className="pillButton outline"
                        disabled={vorlageSaving}
                        onClick={() => void reloadGruppenVorlage()}
                      >
                        Gruppen-Vorlage laden
                      </button>
                      <button
                        type="button"
                        className="pillButton outline"
                        disabled={vorlageSaving}
                        onClick={() => void saveMachineEigenVorlage()}
                      >
                        {vorlageSaving ? "Speichern…" : "Als Maschinen-Vorlage speichern"}
                      </button>
                      {machineHasEigenProtokollVorlage(machine) ? (
                        <button
                          type="button"
                          className="pillButton outline"
                          disabled={vorlageSaving}
                          onClick={() => void clearMachineEigenVorlage()}
                        >
                          Maschinen-Vorlage aus
                        </button>
                      ) : null}
                      <Link
                        className="pillButton outline"
                        href="/maschinen/geraetgruppen"
                      >
                        Gruppen bearbeiten
                      </Link>
                    </div>
                  ) : null}
                  {saveError ? <p className="errorText aaProtokollVorlageFeedback">{saveError}</p> : null}
                  {message ? (
                    <p className="protocolNotice success aaProtokollVorlageFeedback">{message}</p>
                  ) : null}
                </div>
                <ArbeitsauftragProtokollSection
                  protocol={order.protocol}
                  canEdit={canWrite}
                  canIssueLager={canIssueLager}
                  machineId={machineId}
                  arbeitsauftragId={order.id}
                  auftragReferenz={`Arbeitsauftrag ${formatWorkOrderAuftragNr(order)}`}
                  onChange={updateProtocol}
                />
              </section>

              <section className="protocolSection card aaBlock">
                <label className="protocolField textAreas">
                  <span>Bemerkung:</span>
                  {bemerkungLines.length > 0 ? (
                    <div className="aaBemerkungCheckSummary" aria-live="polite">
                      <ul className="aaBemerkungCheckSummaryList">
                        {bemerkungLines.map((line) => (
                          <li key={line}>{line}</li>
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
            ) : null}

            {!isViewMode ? (
              <div className="arbeitsauftragPrintOnly arbeitsauftragPrintSource">
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
