"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import AppPageShell from "../components/AppPageShell";
import {
  BUCHUNG_STATUS_LABELS,
  fetchPkwBuchungen,
  fetchPkwServicearten,
  formatSlotLabel,
  updatePkwBuchung,
} from "../../lib/pkw";
import { hasPkwServiceRead, hasPkwServiceWrite } from "../../lib/pkw-permissions";
import type { PkwBuchung, PkwBuchungStatus } from "../../lib/types/pkw";

const PLAETZE = [1, 2, 3, 4, 5];
const STATUS_OPTIONS: PkwBuchungStatus[] = [
  "angefragt",
  "bestaetigt",
  "in_arbeit",
  "fertig",
  "abgesagt",
];

function dateYmd(d: Date) {
  return d.toISOString().slice(0, 10);
}

export default function PkwServicePage() {
  const [day, setDay] = useState(() => dateYmd(new Date()));
  const [buchungen, setBuchungen] = useState<PkwBuchung[]>([]);
  const [serviceLabels, setServiceLabels] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [canRead, setCanRead] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const from = `${day}T00:00:00.000Z`;
    const to = `${day}T23:59:59.999Z`;
    const [bRes, sRes] = await Promise.all([
      fetchPkwBuchungen({ from, to }),
      fetchPkwServicearten(),
    ]);
    if (bRes.error) setError(bRes.error);
    else setBuchungen(bRes.data ?? []);
    if (sRes.data) {
      const map: Record<string, string> = {};
      for (const s of sRes.data) map[s.key] = s.label;
      setServiceLabels(map);
    }
    setLoading(false);
  }, [day]);

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

  const byPlatz = useMemo(() => {
    const map = new Map<number, PkwBuchung[]>();
    for (const n of PLAETZE) map.set(n, []);
    for (const b of buchungen) {
      if (b.status === "abgesagt") continue;
      const p = b.platz_nummer ?? 0;
      if (p >= 1 && p <= 5) map.get(p)?.push(b);
    }
    return map;
  }, [buchungen]);

  async function patchStatus(id: string, status: PkwBuchungStatus) {
    const { data, error: err } = await updatePkwBuchung(id, { status });
    if (err || !data) return;
    setBuchungen((cur) => cur.map((b) => (b.id === id ? data : b)));
  }

  async function movePlatz(id: string, platz_nummer: number) {
    const { data, error: err } = await updatePkwBuchung(id, { platz_nummer });
    if (err || !data) return;
    setBuchungen((cur) => cur.map((b) => (b.id === id ? data : b)));
  }

  if (!canRead && !loading) {
    return (
      <AppPageShell activeHref="/pkw-service" subtitle="PKW">
        <p className="errorText">
          Keine Berechtigung: pkw.service.read — im Supabase SQL Editor{" "}
          <code>supabase/pkw-permissions-only.sql</code> ausführen, dann neu anmelden.
        </p>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell activeHref="/pkw-service" subtitle="PKW · Service" title="PKW-Service">
      <div className="pkwPageStack">
        <article className="card">
          <div className="pkwToolbar">
            <label className="pkwFieldInline">
              <span>Tag</span>
              <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
            </label>
            <a className="secondaryBtn" href="/pkw/buchen" target="_blank" rel="noreferrer">
              Kunden-Portal (QR)
            </a>
          </div>
          {error ? <p className="errorText">{error}</p> : null}
          {loading ? <p className="subtitle">Laden…</p> : null}

          <div className="pkwPlatzBoard">
            {PLAETZE.map((num) => (
              <section key={num} className="pkwPlatzColumn card">
                <h3 className="pkwPlatzTitle">Platz {num}</h3>
                {(byPlatz.get(num) ?? []).length === 0 ? (
                  <p className="subtitle">Frei</p>
                ) : (
                  (byPlatz.get(num) ?? []).map((b) => (
                    <div key={b.id} className={`pkwBuchungCard status-${b.status}`}>
                      <strong>{b.kennzeichen}</strong>
                      <span>{formatSlotLabel(b.slot_start)}</span>
                      {b.km_stand != null ? <span>{b.km_stand} km</span> : null}
                      <ul className="pkwServiceTags">
                        {(b.servicearten ?? []).map((k) => (
                          <li key={k}>{serviceLabels[k] ?? k}</li>
                        ))}
                      </ul>
                      {b.problem_text ? <p className="pkwProblem">{b.problem_text}</p> : null}
                      {canWrite ? (
                        <div className="pkwBuchungActions">
                          <select
                            value={b.status}
                            onChange={(e) =>
                              patchStatus(b.id, e.target.value as PkwBuchungStatus)
                            }
                          >
                            {STATUS_OPTIONS.map((s) => (
                              <option key={s} value={s}>
                                {BUCHUNG_STATUS_LABELS[s]}
                              </option>
                            ))}
                          </select>
                          <select
                            value={b.platz_nummer ?? ""}
                            onChange={(e) => movePlatz(b.id, Number(e.target.value))}
                          >
                            {PLAETZE.map((p) => (
                              <option key={p} value={p}>
                                → Platz {p}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}
                    </div>
                  ))
                )}
              </section>
            ))}
          </div>
        </article>

        <article className="card machineTableWrap">
          <h2 className="lagerTableSectionTitle">Alle Termine am {day}</h2>
          <table className="dataTable">
            <thead>
              <tr>
                <th>Zeit</th>
                <th>Platz</th>
                <th>Kennzeichen</th>
                <th>Leistungen</th>
                <th>Status</th>
                <th>Quelle</th>
              </tr>
            </thead>
            <tbody>
              {buchungen.map((b) => (
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
                  <td>{b.source}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      </div>
    </AppPageShell>
  );
}
