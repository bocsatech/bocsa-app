"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import AppPageShell from "../components/AppPageShell";
import PkwBuchungEditModal from "../components/PkwBuchungEditModal";
import {
  BUCHUNG_SOURCE_LABELS,
  BUCHUNG_STATUS_LABELS,
  buchungRangeParams,
  dateYmdLocal,
  fetchPkwBuchungen,
  fetchPkwFahrzeuge,
  fetchPkwServicearten,
  fetchPkwTeam,
  formatSlotLabel,
  PKW_SERVICE_HOURS,
} from "../../lib/pkw";
import { hasPkwServiceRead, hasPkwServiceWrite } from "../../lib/pkw-permissions";
import type {
  PkwBuchung,
  PkwBuchungStatus,
  PkwFahrzeug,
  PkwServiceArt,
  PkwTeamUser,
} from "../../lib/types/pkw";

const PLAETZE = [1, 2, 3, 4, 5];
const DAY_HOURS = Array.from(
  { length: PKW_SERVICE_HOURS.bis - PKW_SERVICE_HOURS.von + 1 },
  (_, i) => PKW_SERVICE_HOURS.von + i
);

function slotDayKey(iso: string) {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DAY_START_MINUTE = PKW_SERVICE_HOURS.von * 60;
const DAY_END_MINUTE = PKW_SERVICE_HOURS.bis * 60;
const DAY_TOTAL_MINUTES = Math.max(1, DAY_END_MINUTE - DAY_START_MINUTE);

function minuteOfDay(iso: string) {
  const date = new Date(iso);
  return date.getHours() * 60 + date.getMinutes();
}

function slotLeftPercent(slotStartIso: string) {
  const start = Math.min(DAY_END_MINUTE, Math.max(DAY_START_MINUTE, minuteOfDay(slotStartIso)));
  return ((start - DAY_START_MINUTE) / DAY_TOTAL_MINUTES) * 100;
}

function slotWidthPercent(slotStartIso: string, slotEndIso: string | null | undefined) {
  const start = Math.min(DAY_END_MINUTE, Math.max(DAY_START_MINUTE, minuteOfDay(slotStartIso)));
  const endRaw = slotEndIso ? minuteOfDay(slotEndIso) : start + 60;
  const end = Math.min(DAY_END_MINUTE, Math.max(start + 15, endRaw));
  return ((end - start) / DAY_TOTAL_MINUTES) * 100;
}

export default function PkwServicePage() {
  const today = dateYmdLocal();
  const [fromDay, setFromDay] = useState(today);
  const [toDay, setToDay] = useState(today);
  const [boardDay, setBoardDay] = useState(today);
  const [statusFilter, setStatusFilter] = useState("");
  const [buchungen, setBuchungen] = useState<PkwBuchung[]>([]);
  const [servicearten, setServicearten] = useState<PkwServiceArt[]>([]);
  const [serviceLabels, setServiceLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [canRead, setCanRead] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editBuchung, setEditBuchung] = useState<PkwBuchung | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [team, setTeam] = useState<PkwTeamUser[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<PkwFahrzeug[]>([]);

  const isSingleDay = fromDay === toDay;
  const teamById = useMemo(() => new Map(team.map((u) => [u.id, u.username])), [team]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const range = buchungRangeParams(fromDay, toDay);
    const [bRes, sRes, fRes] = await Promise.all([
      fetchPkwBuchungen({
        from: range.from,
        to: range.to,
        status: statusFilter || undefined,
      }),
      fetchPkwServicearten(),
      fetchPkwFahrzeuge(),
    ]);
    if (bRes.error) setError(bRes.error);
    else setBuchungen(bRes.data ?? []);
    setFahrzeuge(fRes.data ?? []);
    if (sRes.data) {
      setServicearten(sRes.data);
      const map: Record<string, string> = {};
      for (const s of sRes.data) map[s.key] = s.label;
      setServiceLabels(map);
    }
    setLoading(false);
  }, [fromDay, toDay, statusFilter]);

  useEffect(() => {
    fetch("/api/auth/session", { credentials: "include", cache: "no-store" })
      .then((r) => r.json())
      .then((result) => {
        const perms = result.permissions ?? [];
        const groups = result.groups ?? [];
        const username = result.username ?? result.user?.username;
        setCanRead(hasPkwServiceRead(perms, groups, username));
        setCanWrite(hasPkwServiceWrite(perms, groups, username));
      });
  }, []);

  useEffect(() => {
    if (canRead) load();
    else setLoading(false);
  }, [canRead, load]);

  useEffect(() => {
    if (!canRead) return;
    fetchPkwTeam().then(({ data }) => {
      if (data) setTeam(data);
    });
  }, [canRead]);

  useEffect(() => {
    if (boardDay < fromDay) setBoardDay(fromDay);
    if (boardDay > toDay) setBoardDay(toDay);
  }, [boardDay, fromDay, toDay]);

  const boardBuchungen = useMemo(
    () => buchungen.filter((b) => slotDayKey(b.slot_start) === boardDay),
    [buchungen, boardDay]
  );

  const byPlatz = useMemo(() => {
    const map = new Map<number, PkwBuchung[]>();
    for (const n of PLAETZE) map.set(n, []);
    for (const b of boardBuchungen) {
      if (b.status === "abgesagt") continue;
      const p = b.platz_nummer ?? 0;
      if (p >= 1 && p <= 5) map.get(p)?.push(b);
      else map.get(1)?.push(b);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.slot_start.localeCompare(b.slot_start));
    }
    return map;
  }, [boardBuchungen]);

  const sortedAll = useMemo(
    () => [...buchungen].sort((a, b) => a.slot_start.localeCompare(b.slot_start)),
    [buchungen]
  );

  function openEdit(b: PkwBuchung | null) {
    setEditBuchung(b);
    setModalOpen(true);
  }

  function handleSaved(b: PkwBuchung) {
    setBuchungen((cur) => {
      const idx = cur.findIndex((x) => x.id === b.id);
      if (idx >= 0) {
        const next = [...cur];
        next[idx] = b;
        return next;
      }
      return [...cur, b].sort((a, c) => a.slot_start.localeCompare(c.slot_start));
    });
  }

  function setPreset(preset: "today" | "week" | "next7") {
    const now = new Date();
    const start = dateYmdLocal(now);
    if (preset === "today") {
      setFromDay(start);
      setToDay(start);
      setBoardDay(start);
      return;
    }
    if (preset === "week") {
      const day = now.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(now);
      monday.setDate(now.getDate() + mondayOffset);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      setFromDay(dateYmdLocal(monday));
      setToDay(dateYmdLocal(sunday));
      setBoardDay(start);
      return;
    }
    const end = new Date(now);
    end.setDate(now.getDate() + 6);
    setFromDay(start);
    setToDay(dateYmdLocal(end));
    setBoardDay(start);
  }

  if (!canRead && !loading) {
    return (
      <AppPageShell activeHref="/pkw-service" subtitle="PKW" contentClassName="pkwKundenPage">
        <p className="errorText">
          Keine Berechtigung: pkw.service.read — im Supabase SQL Editor{" "}
          <code>supabase/pkw-permissions-only.sql</code> ausführen, dann neu anmelden.
        </p>
      </AppPageShell>
    );
  }

  return (
    <>
    <AppPageShell
      activeHref="/pkw-service"
      subtitle="PKW · Service"
      title="PKW-Service"
      contentClassName="pkwKundenPage"
    >
      <div className="pkwPageStack">
        <article className="card">
          <div className="pkwToolbar pkwToolbarWrap">
            <label className="pkwFieldInline">
              <span>Von</span>
              <input
                type="date"
                value={fromDay}
                max={toDay}
                onChange={(e) => {
                  const v = e.target.value;
                  setFromDay(v);
                  if (v > toDay) setToDay(v);
                }}
              />
            </label>
            <label className="pkwFieldInline">
              <span>Bis</span>
              <input
                type="date"
                value={toDay}
                min={fromDay}
                onChange={(e) => {
                  const v = e.target.value;
                  setToDay(v);
                  if (v < fromDay) setFromDay(v);
                }}
              />
            </label>
            <label className="pkwFieldInline">
              <span>Status</span>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">Alle</option>
                {(["angefragt", "bestaetigt", "in_arbeit", "fertig", "abgesagt"] as PkwBuchungStatus[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {BUCHUNG_STATUS_LABELS[s]}
                    </option>
                  )
                )}
              </select>
            </label>
            <div className="pkwToolbarPresets">
              <button type="button" className="secondaryBtn" onClick={() => setPreset("today")}>
                Heute
              </button>
              <button type="button" className="secondaryBtn" onClick={() => setPreset("week")}>
                Diese Woche
              </button>
              <button type="button" className="secondaryBtn" onClick={() => setPreset("next7")}>
                7 Tage
              </button>
            </div>
            {canWrite ? (
              <button type="button" className="primaryBtn" onClick={() => openEdit(null)}>
                + Termin
              </button>
            ) : null}
            <a className="secondaryBtn" href="/pkw/buchen" target="_blank" rel="noreferrer">
              Kunden-Portal (QR)
            </a>
          </div>
          {error ? <p className="errorText">{error}</p> : null}
          {loading ? <p className="subtitle">Laden…</p> : null}
          {!loading && !error ? (
            <p className="pkwMeta">
              {sortedAll.length} Termin(e) · Werkstatt {PKW_SERVICE_HOURS.von}:00–{PKW_SERVICE_HOURS.bis}:00
              {isSingleDay ? ` · Tagesansicht ${fromDay}` : ` · ${fromDay} – ${toDay}`}
            </p>
          ) : null}

          <div className="pkwBoardDayPicker">
            <label className="pkwFieldInline">
              <span>Tagesansicht</span>
              <input
                type="date"
                value={boardDay}
                min={fromDay}
                max={toDay}
                onChange={(e) => setBoardDay(e.target.value)}
              />
            </label>
          </div>

          <div
            className="pkwDayBoard pkwDayBoardTimeline"
            style={{ "--pkw-hour-count": DAY_HOURS.length } as CSSProperties}
          >
            <div className="pkwScheduleHeader">
              <div className="pkwPlatzCorner" aria-hidden />
              <div className="pkwScheduleTimeRow" aria-hidden>
                {DAY_HOURS.map((h) => (
                  <span key={h} className="pkwDayHourMark">
                    {String(h).padStart(2, "0")}:00
                  </span>
                ))}
              </div>
            </div>

            <div className="pkwPlatzList">
              {PLAETZE.map((num) => (
                <section key={num} className="pkwPlatzRow card">
                  <h3 className="pkwPlatzTitle">Platz {num}</h3>
                  <div className="pkwPlatzTimeline">
                    <div className="pkwPlatzTimelineGrid" aria-hidden />
                    {(byPlatz.get(num) ?? []).length === 0 ? (
                      <p className="subtitle pkwPlatzFrei pkwPlatzFreiOverlay">Frei</p>
                    ) : (
                      (byPlatz.get(num) ?? []).map((b) => (
                        <div
                          key={b.id}
                          className="pkwBuchungSlot"
                          style={{
                            left: `${slotLeftPercent(b.slot_start)}%`,
                            width: `${Math.max(6, slotWidthPercent(b.slot_start, b.slot_end))}%`,
                          }}
                        >
                          <BuchungCard
                            buchung={b}
                            serviceLabels={serviceLabels}
                            monteur={
                              b.assigned_user_id ? teamById.get(b.assigned_user_id) ?? null : null
                            }
                            canWrite={canWrite}
                            onEdit={() => openEdit(b)}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </article>

        <article className="card machineTableWrap">
          <h2 className="lagerTableSectionTitle">
            Alle Termine
            {fromDay === toDay ? ` am ${fromDay}` : ` ${fromDay} – ${toDay}`}
          </h2>
          {sortedAll.length === 0 && !loading ? (
            <p className="subtitle">Keine Termine im gewählten Zeitraum.</p>
          ) : (
            <table className="dataTable">
              <thead>
                <tr>
                  <th>Datum / Zeit</th>
                  <th>Platz</th>
                  <th>Kennzeichen</th>
                  <th>Leistungen</th>
                  <th>Status</th>
                  <th>Quelle</th>
                  {canWrite ? <th /> : null}
                </tr>
              </thead>
              <tbody>
                {sortedAll.map((b) => (
                  <tr key={b.id}>
                    <td>{formatSlotLabel(b.slot_start)}</td>
                    <td>{b.platz_nummer ?? "—"}</td>
                    <td>{b.kennzeichen}</td>
                    <td>
                      {(b.servicearten ?? []).map((k) => serviceLabels[k] ?? k).join(", ") ||
                        b.problem_text ||
                        "—"}
                    </td>
                    <td>
                      <span className={`statusBadge status-${b.status}`}>
                        {BUCHUNG_STATUS_LABELS[b.status]}
                      </span>
                    </td>
                    <td>{BUCHUNG_SOURCE_LABELS[b.source] ?? b.source}</td>
                    {canWrite ? (
                      <td>
                        <button type="button" className="pillButton outline" onClick={() => openEdit(b)}>
                          Bearbeiten
                        </button>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </article>
      </div>
    </AppPageShell>

    {canWrite ? (
      <PkwBuchungEditModal
        open={modalOpen}
        buchung={editBuchung}
        servicearten={servicearten}
        fahrzeuge={fahrzeuge}
        defaultDay={boardDay < today ? today : boardDay}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
        onServiceartenChange={setServicearten}
      />
    ) : null}
    </>
  );
}

function BuchungCard({
  buchung: b,
  serviceLabels,
  monteur,
  canWrite,
  onEdit,
}: {
  buchung: PkwBuchung;
  serviceLabels: Record<string, string>;
  monteur: string | null;
  canWrite: boolean;
  onEdit: () => void;
}) {
  const schritte = (b.munkafolyamat ?? []).filter((s) => s.text?.trim());
  return (
    <div className={`pkwBuchungCard status-${b.status}`}>
      <div className="pkwBuchungCardHead">
        <strong>{b.kennzeichen}</strong>
        <span>{formatSlotLabel(b.slot_start)}</span>
      </div>
      {b.km_stand != null ? <span>{b.km_stand} km</span> : null}
      {monteur ? <span className="scanHint">Monteur: {monteur}</span> : null}
      <ul className="pkwServiceTags">
        {(b.servicearten ?? []).map((k) => (
          <li key={k}>{serviceLabels[k] ?? k}</li>
        ))}
      </ul>
      {b.problem_text ? <p className="pkwProblem">{b.problem_text}</p> : null}
      {schritte.length > 0 ? (
        <ul className="pkwSchrittList">
          {schritte.map((s) => (
            <li key={s.id} className={s.erledigt ? "done" : ""}>
              {s.text}
            </li>
          ))}
        </ul>
      ) : null}
      {canWrite ? (
        <button type="button" className="pillButton outline pkwBuchungEditBtn" onClick={onEdit}>
          Bearbeiten
        </button>
      ) : null}
    </div>
  );
}
