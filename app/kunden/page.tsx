"use client";

import { useCallback, useEffect, useState } from "react";
import AppPageShell from "../components/AppPageShell";
import KundeModal from "../components/KundeModal";
import PkwFahrzeugModal from "../components/PkwFahrzeugModal";
import {
  fetchKunden,
  fetchPkwFahrzeuge,
  formatKundeName,
} from "../../lib/pkw";
import { hasPkwKundenRead, hasPkwKundenWrite } from "../../lib/pkw-permissions";
import type { Kunde, PkwFahrzeug } from "../../lib/types/pkw";

export default function KundenPage() {
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<PkwFahrzeug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canRead, setCanRead] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [kundeModalOpen, setKundeModalOpen] = useState(false);
  const [fahrzeugModalOpen, setFahrzeugModalOpen] = useState(false);
  const [selectedKunde, setSelectedKunde] = useState<Kunde | null>(null);
  const [selectedFahrzeug, setSelectedFahrzeug] = useState<PkwFahrzeug | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [kRes, fRes] = await Promise.all([fetchKunden(), fetchPkwFahrzeuge()]);
    if (kRes.error) setError(kRes.error);
    else setKunden(kRes.data ?? []);
    if (!fRes.error) setFahrzeuge(fRes.data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((result) => {
        const perms = result.permissions ?? [];
        const groups = result.groups ?? [];
        const username = result.username ?? result.user?.username;
        setCanRead(hasPkwKundenRead(perms, groups, username));
        setCanWrite(hasPkwKundenWrite(perms, groups, username));
      });
  }, []);

  useEffect(() => {
    if (canRead) load();
    else setLoading(false);
  }, [canRead, load]);

  const filtered = kunden.filter((k) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    const hay = [
      k.kundennummer,
      k.vorname,
      k.nachname,
      k.firma,
      k.email,
      k.telefon,
      k.ort,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });

  function fahrzeugeForKunde(kundeId: string) {
    return fahrzeuge.filter((f) => f.kunde_id === kundeId);
  }

  if (!canRead && !loading) {
    return (
      <AppPageShell activeHref="/kunden" subtitle="PKW">
        <p className="errorText">Keine Berechtigung: pkw.kunden.read</p>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell
      activeHref="/kunden"
      subtitle="PKW · Kunden"
      title="Kunden"
      actions={
        canWrite ? (
          <button type="button" className="primaryBtn" onClick={() => {
            setSelectedKunde(null);
            setKundeModalOpen(true);
          }}>
            Kunde anlegen
          </button>
        ) : null
      }
    >
      <div className="pkwPageStack">
        <article className="card">
          <div className="pkwToolbar">
            <input
              type="search"
              className="pkwSearchInput"
              placeholder="Suchen (Name, Firma, E-Mail…)"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <span className="pkwMeta">{filtered.length} Kunde(n)</span>
          </div>

          {error ? <p className="errorText">{error}</p> : null}
          {loading ? <p className="subtitle">Laden…</p> : null}

          {!loading && filtered.length === 0 ? (
            <p className="subtitle">Noch keine Kunden. SQL: supabase/pkw-setup.sql ausführen.</p>
          ) : null}

          <div className="pkwKundenGrid">
            {filtered.map((kunde) => (
              <section key={kunde.id} className="pkwKundeCard card">
                <header className="pkwKundeCardHead">
                  <div>
                    <h2>{formatKundeName(kunde)}</h2>
                    <p className="subtitle">
                      {kunde.kundennummer ? `#${kunde.kundennummer}` : "—"}
                      {kunde.email ? ` · ${kunde.email}` : ""}
                      {kunde.telefon ? ` · ${kunde.telefon}` : ""}
                    </p>
                    <p className="subtitle">
                      {[kunde.strasse, kunde.plz, kunde.ort].filter(Boolean).join(", ") || "—"}
                    </p>
                    <p className="pkwPinHint">
                      Portal-PIN: {kunde.portal_pin_set ? "gesetzt" : "nicht gesetzt"}
                    </p>
                  </div>
                  {canWrite ? (
                    <div className="pkwCardActions">
                      <button
                        type="button"
                        className="secondaryBtn"
                        onClick={() => {
                          setSelectedKunde(kunde);
                          setKundeModalOpen(true);
                        }}
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        className="secondaryBtn"
                        onClick={() => {
                          setSelectedFahrzeug(null);
                          setSelectedKunde(kunde);
                          setFahrzeugModalOpen(true);
                        }}
                      >
                        + Fahrzeug
                      </button>
                    </div>
                  ) : null}
                </header>

                <ul className="pkwFahrzeugList">
                  {fahrzeugeForKunde(kunde.id).length === 0 ? (
                    <li className="subtitle">Keine Fahrzeuge</li>
                  ) : (
                    fahrzeugeForKunde(kunde.id).map((fz) => (
                      <li key={fz.id}>
                        <strong>{fz.kennzeichen}</strong>
                        {[fz.marke, fz.modell].filter(Boolean).join(" ")}
                        {fz.km_stand != null ? ` · ${fz.km_stand} km` : ""}
                        {canWrite ? (
                          <button
                            type="button"
                            className="linkBtn"
                            onClick={() => {
                              setSelectedKunde(kunde);
                              setSelectedFahrzeug(fz);
                              setFahrzeugModalOpen(true);
                            }}
                          >
                            Bearbeiten
                          </button>
                        ) : null}
                        <a
                          className="linkBtn"
                          href={`/pkw/buchen?token=${fz.qr_token}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Portal / QR
                        </a>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            ))}
          </div>
        </article>
      </div>

      {kundeModalOpen ? (
        <KundeModal
          kunde={selectedKunde}
          onClose={() => setKundeModalOpen(false)}
          onSaved={(k) => {
            setKunden((cur) => {
              const i = cur.findIndex((x) => x.id === k.id);
              if (i === -1) return [...cur, k].sort((a, b) => a.nachname.localeCompare(b.nachname));
              return cur.map((x) => (x.id === k.id ? k : x));
            });
            setKundeModalOpen(false);
          }}
        />
      ) : null}

      {fahrzeugModalOpen && selectedKunde ? (
        <PkwFahrzeugModal
          kunde={selectedKunde}
          fahrzeug={selectedFahrzeug}
          onClose={() => setFahrzeugModalOpen(false)}
          onSaved={(fz) => {
            setFahrzeuge((cur) => {
              const i = cur.findIndex((x) => x.id === fz.id);
              if (i === -1) return [...cur, fz];
              return cur.map((x) => (x.id === fz.id ? fz : x));
            });
            setFahrzeugModalOpen(false);
          }}
        />
      ) : null}
    </AppPageShell>
  );
}
