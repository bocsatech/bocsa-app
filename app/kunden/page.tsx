"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import AppPageShell from "../components/AppPageShell";
import KundeModal from "../components/KundeModal";
import PkwFahrzeugModal from "../components/PkwFahrzeugModal";
import {
  confirmDeletePkwFahrzeug,
  deletePkwFahrzeug,
  fetchKunden,
  fetchPkwFahrzeuge,
  formatKundeName,
  formatPkwReifenKurz,
  getPkwPortalBuchungsUrl,
} from "../../lib/pkw";
import { hasPkwKundenRead, hasPkwKundenWrite } from "../../lib/pkw-permissions";
import type { Kunde, PkwFahrzeug } from "../../lib/types/pkw";

export default function KundenPage() {
  const router = useRouter();

  useEffect(() => {
    document.documentElement.classList.add("kunden-route-root");
    document.body.classList.add("kunden-route");
    return () => {
      document.documentElement.classList.remove("kunden-route-root");
      document.body.classList.remove("kunden-route");
    };
  }, []);

  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [fahrzeuge, setFahrzeuge] = useState<PkwFahrzeug[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [canRead, setCanRead] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [setupRunning, setSetupRunning] = useState(false);
  const [setupHint, setSetupHint] = useState<string | null>(null);
  const [kundeModalOpen, setKundeModalOpen] = useState(false);
  const [fahrzeugModalOpen, setFahrzeugModalOpen] = useState(false);
  const [selectedKunde, setSelectedKunde] = useState<Kunde | null>(null);
  const [selectedPrimaryFahrzeug, setSelectedPrimaryFahrzeug] = useState<PkwFahrzeug | null>(null);
  const [selectedFahrzeug, setSelectedFahrzeug] = useState<PkwFahrzeug | null>(null);
  const [deletingFahrzeugId, setDeletingFahrzeugId] = useState<string | null>(null);
  const [filter, setFilter] = useState("");

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);
    const [kRes, fRes] = await Promise.all([fetchKunden(), fetchPkwFahrzeuge()]);
    if (kRes.error) setError(kRes.error);
    else setKunden(kRes.data ?? []);
    if (!fRes.error) setFahrzeuge(fRes.data ?? []);
    if (!options?.silent) setLoading(false);
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
        setIsAdmin(
          groups.includes("Admin") ||
            String(username ?? "").trim().toLowerCase() === "admin"
        );
      })
      .finally(() => setAuthChecked(true));
  }, []);

  const tablesMissing = Boolean(
    error?.includes("PKW-Tabellen fehlen") || error?.includes("Could not find the table")
  );

  async function runPkwSetup() {
    setSetupRunning(true);
    setSetupHint(null);
    const response = await fetch("/api/admin/pkw-setup", {
      method: "POST",
      credentials: "include",
    });
    const result = await response.json().catch(() => ({}));
    setSetupRunning(false);

    if (response.ok && result.ok) {
      setSetupHint("Tabellen angelegt. Seite wird neu geladen …");
      window.setTimeout(() => load(), 1500);
      return;
    }

    const editor = result.sqlEditorUrl ? ` ${result.sqlEditorUrl}` : "";
    setSetupHint(
      (result.error as string) ||
        `Automatisches Setup nicht möglich.${editor} Dann nacheinander ausführen: supabase/pkw-setup.sql und supabase/pkw-permissions-only.sql`
    );
  }

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

  function primaryFahrzeugForKunde(kundeId: string) {
    const list = fahrzeugeForKunde(kundeId);
    return list.length > 0 ? list[0] : null;
  }

  async function handleDeleteFahrzeug(fz: PkwFahrzeug) {
    if (!canWrite) return;
    if (!confirmDeletePkwFahrzeug(fz.kennzeichen)) return;

    setDeletingFahrzeugId(fz.id);
    const { error: deleteError } = await deletePkwFahrzeug(fz.id);
    setDeletingFahrzeugId(null);

    if (deleteError) {
      window.alert(deleteError);
      return;
    }

    setFahrzeuge((cur) => cur.filter((x) => x.id !== fz.id));
    if (selectedFahrzeug?.id === fz.id) {
      setFahrzeugModalOpen(false);
      setSelectedFahrzeug(null);
    }
  }

  if (!authChecked) {
    return (
      <AppPageShell
        activeHref="/kunden"
        subtitle="PKW"
        mainClassName="kundenShell"
        contentClassName="kundenListPage"
      >
        <p className="subtitle">Laden…</p>
      </AppPageShell>
    );
  }

  if (!canRead && !kundeModalOpen && !fahrzeugModalOpen) {
    return (
      <AppPageShell
        activeHref="/kunden"
        subtitle="PKW"
        mainClassName="kundenShell"
        contentClassName="kundenListPage"
      >
        <p className="errorText">Keine Berechtigung: pkw.kunden.read</p>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell
      activeHref="/kunden"
      subtitle="PKW · Kunden"
      mainClassName="kundenShell"
      contentClassName="kundenListPage"
      title="Kunden"
      actions={
        canWrite ? (
          <button type="button" className="primaryBtn" onClick={() => {
            setSelectedKunde(null);
            setSelectedPrimaryFahrzeug(null);
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

          {error ? (
            <div className="pkwSetupAlert">
              <p className="errorText">{error}</p>
              {tablesMissing && isAdmin ? (
                <div className="pkwSetupActions">
                  <button
                    type="button"
                    className="primaryBtn"
                    disabled={setupRunning}
                    onClick={runPkwSetup}
                  >
                    {setupRunning ? "Wird angelegt…" : "PKW-Tabellen anlegen"}
                  </button>
                  <p className="subtitle">
                    Oder im Supabase SQL Editor:{" "}
                    <code>supabase/pkw-setup.sql</code>, dann{" "}
                    <code>supabase/pkw-permissions-only.sql</code> — 30 s warten, Seite
                    neu laden.
                  </p>
                </div>
              ) : null}
              {setupHint ? <p className="subtitle">{setupHint}</p> : null}
            </div>
          ) : null}
          {loading ? <p className="subtitle">Laden…</p> : null}

          {!loading && filtered.length === 0 && !error ? (
            <p className="subtitle">
              Noch keine Kunden. Tabellen anlegen:{" "}
              <code>npm run db:pkw</code> oder{" "}
              <code>supabase/pkw-setup.sql</code> im SQL Editor, danach optional{" "}
              <code>npm run seed:pkw</code>.
            </p>
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
                      {fahrzeugeForKunde(kunde.id).length > 0
                        ? ` · Kennzeichen: ${fahrzeugeForKunde(kunde.id)
                            .map((fz) => fz.kennzeichen)
                            .join(", ")}`
                        : " · Kein Kennzeichen hinterlegt"}
                    </p>
                  </div>
                  {canWrite ? (
                    <div className="pkwCardActions">
                      <button
                        type="button"
                        className="secondaryBtn"
                        onClick={() => {
                          setSelectedKunde(kunde);
                          setSelectedPrimaryFahrzeug(primaryFahrzeugForKunde(kunde.id));
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
                        {formatPkwReifenKurz(fz) ? ` · ${formatPkwReifenKurz(fz)}` : ""}
                        {canWrite ? (
                          <button
                            type="button"
                            className="linkBtn"
                            onClick={() => router.push(`/pkw/fahrzeuge/${fz.id}`)}
                          >
                            Bearbeiten
                          </button>
                        ) : null}
                        {canWrite ? (
                          <button
                            type="button"
                            className="linkBtn linkBtnDanger"
                            disabled={deletingFahrzeugId === fz.id}
                            onClick={() => handleDeleteFahrzeug(fz)}
                          >
                            {deletingFahrzeugId === fz.id ? "Löschen…" : "Löschen"}
                          </button>
                        ) : null}
                        <a
                          className="linkBtn"
                          href={getPkwPortalBuchungsUrl(fz.qr_token)}
                          target="_blank"
                          rel="noreferrer"
                          title="Kundenportal (QR-Code)"
                        >
                          QR-Code · Portal
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
          primaryFahrzeug={selectedPrimaryFahrzeug}
          tablesMissing={tablesMissing}
          onClose={() => setKundeModalOpen(false)}
          onSaved={(k, fz) => {
            setKunden((cur) => {
              const i = cur.findIndex((x) => x.id === k.id);
              if (i === -1) return [...cur, k].sort((a, b) => a.nachname.localeCompare(b.nachname));
              return cur.map((x) => (x.id === k.id ? k : x));
            });
            if (fz) {
              setFahrzeuge((cur) => {
                const i = cur.findIndex((x) => x.id === fz.id);
                if (i === -1) return [...cur, fz].sort((a, b) => a.kennzeichen.localeCompare(b.kennzeichen));
                return cur.map((x) => (x.id === fz.id ? fz : x));
              });
            }
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
            setSelectedFahrzeug(fz);
          }}
          onDeleted={(id) => {
            setFahrzeuge((cur) => cur.filter((x) => x.id !== id));
            setFahrzeugModalOpen(false);
            setSelectedFahrzeug(null);
          }}
        />
      ) : null}
    </AppPageShell>
  );
}
