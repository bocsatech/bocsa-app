"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import "../arbeitsauftrag-form.css";
import AppPageShell from "./AppPageShell";
import ArbeitsauftragProtokollSection from "./ArbeitsauftragProtokollSection";
import PkwArbeitsauftragWorksheetBlock from "./PkwArbeitsauftragWorksheetBlock";
import { reserveWorkOrderAuftragNr } from "../../lib/auftrag-nr";
import {
  collectBemerkungLines,
  issueProtocolStockDelta,
  linkProtocolToLager,
  type WorkOrderProtocol,
} from "../../lib/arbeitsauftrag-protokoll";
import {
  buildPkwArbeitsauftragDetailHref,
  navigateToPkwArbeitsauftragList,
} from "../../lib/pkw-arbeitsauftrag-routes";
import { fetchProtocolForNewPkwWorkOrder } from "../../lib/pkw-arbeitsauftrag-protokoll";
import { fetchPkwFahrzeugById, fetchPkwGruppeVorlage, savePkwFahrzeug } from "../../lib/pkw";
import { fetchLagerTeile } from "../../lib/lager";
import {
  createEmptyWorkOrder,
  findWorkOrderByAuftragNr,
  formatOrderType,
  formatWorkOrderAuftragNr,
  getPkwWorkOrders,
  mergePkwWorkOrder,
  normalizeWorkOrder,
  type WorkOrder,
} from "../../lib/pkw-work-orders";
import { getPkwErsatzteile } from "../../lib/pkw-ersatzteile";
import { maintenancePartsToScheduleRows } from "../../lib/geraetgruppe-protokoll";
import type { PkwFahrzeug } from "../../lib/types/pkw";

type Props = {
  fahrzeugId: string;
  auftragId?: string | null;
  initialAuftragNr?: string | null;
  initialType?: string | null;
  autoPrint?: boolean;
  editMode?: boolean;
};

export default function PkwArbeitsauftragForm({
  fahrzeugId,
  auftragId,
  initialAuftragNr,
  initialType,
  autoPrint = false,
  editMode = false,
}: Props) {
  const router = useRouter();
  const [fahrzeug, setFahrzeug] = useState<PkwFahrzeug | null>(null);
  const [order, setOrder] = useState<WorkOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [canWrite, setCanWrite] = useState(false);
  const [canIssueLager, setCanIssueLager] = useState(false);

  const isNew = !auftragId && Boolean(initialType?.trim());
  const isViewMode = Boolean(auftragId) && !isNew && !editMode;

  const viewHref = buildPkwArbeitsauftragDetailHref({ fahrzeugId, auftragId });
  const editHref = buildPkwArbeitsauftragDetailHref({ fahrzeugId, auftragId, edit: true });

  const title = useMemo(() => {
    if (isNew && initialType) return `Neuer Arbeitsauftrag · ${formatOrderType(initialType)}`;
    if (order) return `Arbeitsauftrag · ${formatWorkOrderAuftragNr(order)}`;
    return "Arbeitsauftrag";
  }, [initialType, isNew, order]);

  const bemerkungLines = useMemo(
    () => (order ? collectBemerkungLines(order.protocol) : []),
    [order]
  );

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
    const isAdmin = name.trim().toLowerCase() === "admin" || groups.includes("Admin");
    const canPkwWrite = perms.includes("pkw.kunden.write") || isAdmin;

    setUsername(name);
    setCanWrite(canPkwWrite);
    setCanIssueLager(
      isAdmin ||
        perms.includes("warehouse.issue") ||
        perms.includes("warehouse.write") ||
        canPkwWrite
    );

    const { data, error: loadError } = await fetchPkwFahrzeugById(fahrzeugId);
    if (loadError || !data) {
      setError(loadError ?? "Fahrzeug nicht gefunden.");
      setFahrzeug(null);
      setOrder(null);
      setLoading(false);
      return;
    }

    setFahrzeug(data);
    const orders = getPkwWorkOrders(data);
    const nrQuery = initialAuftragNr?.trim();
    const existing = auftragId
      ? orders.find((item) => item.id === auftragId)
      : nrQuery
        ? findWorkOrderByAuftragNr(orders, nrQuery)
        : null;

    if ((auftragId || nrQuery) && !existing) {
      setError("Arbeitsauftrag nicht gefunden.");
      setOrder(null);
      setLoading(false);
      return;
    }

    if (existing) {
      setOrder(normalizeWorkOrder(existing));
    } else if (initialType?.trim()) {
      const resolved = await fetchProtocolForNewPkwWorkOrder(data);
      const empty = createEmptyWorkOrder({
        type: initialType,
        depot: data.kunde?.firma?.trim() || data.kennzeichen,
        username: name,
        protocol: resolved.protocol,
        protocolSource: resolved.source,
        protocolSubgroup: resolved.gruppe,
      });
      empty.hourMeterMachine =
        data.km_stand != null ? String(data.km_stand) : "";
      try {
        const { auftragNr } = await reserveWorkOrderAuftragNr({
          type: empty.type,
          depot: empty.depot || "PKW",
          date: empty.date,
        });
        empty.auftragNr = auftragNr;
      } catch {
        /* optional */
      }
      setOrder(empty);
    } else {
      setOrder(null);
    }

    setLoading(false);
  }, [auftragId, initialAuftragNr, fahrzeugId, initialType]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!autoPrint || loading || !order || !fahrzeug) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [autoPrint, fahrzeug, loading, order]);

  function updateOrder(patch: Partial<WorkOrder>) {
    setOrder((current) => (current ? { ...current, ...patch } : current));
  }

  function updateProtocol(protocol: WorkOrderProtocol) {
    setOrder((current) => (current ? { ...current, protocol } : current));
  }

  async function reloadGruppenVorlage() {
    if (!fahrzeug || !order) return;
    const gruppe = fahrzeug.gruppe?.trim();
    if (!gruppe) {
      setSaveError("Keine PKW-Gruppe am Fahrzeug hinterlegt.");
      return;
    }
    const { data, error: err } = await fetchPkwGruppeVorlage(gruppe);
    if (err) {
      setSaveError(err);
      return;
    }
    const parts = getPkwErsatzteile({ ersatzteile: data?.ersatzteile ?? [] } as PkwFahrzeug);
    updateProtocol({
      ...order.protocol,
      serviceSchedule: maintenancePartsToScheduleRows(parts),
    });
    setMessage(`Gruppen-Vorlage „${gruppe}" geladen.`);
  }

  async function persistOrder(orderToSave: WorkOrder) {
    if (!fahrzeug || !canWrite) return false;

    setSaving(true);
    setSaveError(null);
    setMessage(null);

    let normalized = normalizeWorkOrder(orderToSave);

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
          fahrzeugId,
        });
      if (issueErr) {
        setSaveError(issueErr.message);
        setSaving(false);
        return false;
      }
      normalized = { ...normalized, protocol: issuedProtocol };
      if (issuedCount > 0) setMessage(`${issuedCount} Lagerposition(en) ausgebucht.`);
    }

    const tab_data = mergePkwWorkOrder(fahrzeug, normalized, username);
    const { data, error: saveErr } = await savePkwFahrzeug({ tab_data }, fahrzeug.id);

    if (saveErr || !data) {
      setSaveError(saveErr ?? "Speichern fehlgeschlagen.");
      setSaving(false);
      return false;
    }

    setFahrzeug(data);
    const saved = getPkwWorkOrders(data).find((item) => item.id === orderToSave.id) ?? normalized;
    setOrder(saved);
    setMessage("Arbeitsauftrag gespeichert.");

    if (isNew) {
      router.replace(
        buildPkwArbeitsauftragDetailHref({
          fahrzeugId: data.id,
          auftragId: orderToSave.id,
        })
      );
    }

    setSaving(false);
    return true;
  }

  async function handleSaveAll() {
    if (!order) return;
    const ok = await persistOrder(order);
    if (ok && !isNew) router.replace(viewHref);
  }

  return (
    <AppPageShell
      activeHref="/pkw/arbeitsauftrag"
      mainClassName="protocolShell"
      contentClassName="protocolPage machineDetailPage"
      top={
        <div className="detailTopBar arbeitsauftragHideOnPrint">
          <h1>{title}</h1>
          <div className="detailTopActions">
            <button
              type="button"
              className="pillButton outline"
              onClick={() => navigateToPkwArbeitsauftragList(router)}
            >
              Zur Liste
            </button>
            <Link className="pillButton outline" href={`/pkw/fahrzeuge/${fahrzeugId}`}>
              Fahrzeug
            </Link>
            {fahrzeug && order ? (
              <button type="button" className="pillButton outline" onClick={() => window.print()}>
                Drucken
              </button>
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
                onClick={() => void handleSaveAll()}
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
      ) : fahrzeug && order ? (
        <>
          <PkwArbeitsauftragWorksheetBlock
            fahrzeug={fahrzeug}
            order={order}
            username={username}
            editable={!isViewMode && canWrite}
            onOrderChange={updateOrder}
            className={isViewMode ? "arbeitsauftragPrintSource" : ""}
          />

          {!isViewMode ? (
            <div className="aaForm arbeitsauftragHideOnPrint">
              {isNew ? (
                <p className="subtitle aaNewAuftragHint" style={{ marginBottom: 12 }}>
                  Neuer Auftrag: {formatOrderType(order.type)}
                  {order.auftragNr?.trim() ? (
                    <>
                      {" "}
                      · Auftrag-Nr. <strong className="aaAuftragNr">{order.auftragNr}</strong>
                    </>
                  ) : null}
                </p>
              ) : null}

              {saveError ? <p className="errorText">{saveError}</p> : null}

              <section className="protocolSection card aaBlock">
                <div className="aaProtokollVorlageBar">
                  <p className="aaProtokollVorlageHint">
                    PKW-Gruppe: <strong>{fahrzeug.gruppe?.trim() || "—"}</strong>
                  </p>
                  {canWrite ? (
                    <div className="aaProtokollVorlageActions">
                      <button
                        type="button"
                        className="pillButton outline"
                        onClick={() => void reloadGruppenVorlage()}
                      >
                        Gruppen-Vorlage laden
                      </button>
                      <Link className="pillButton outline" href="/pkw/gruppen">
                        PKW-Gruppen bearbeiten
                      </Link>
                    </div>
                  ) : null}
                </div>
                <ArbeitsauftragProtokollSection
                  protocol={order.protocol}
                  canEdit={canWrite}
                  canIssueLager={canIssueLager}
                  fahrzeugId={fahrzeugId}
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

              {message ? <p className="protocolNotice success">{message}</p> : null}
            </div>
          ) : null}
        </>
      ) : null}
    </AppPageShell>
  );
}
