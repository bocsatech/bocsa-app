"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppPageShell from "../../components/AppPageShell";
import LagerPkwTerminCard from "../../components/LagerPkwTerminCard";
import LagerPkwTerminDetailModal from "../../components/LagerPkwTerminDetailModal";
import {
  buildLagerPkwTerminPartRows,
  type LagerPkwTerminPartRow,
} from "../../../lib/lager-pkw-termine";
import { fetchLagerTeile } from "../../../lib/lager";
import { buchungRangeParams, dateYmdLocal, fetchPkwBuchungen, fetchPkwFahrzeuge } from "../../../lib/pkw";
import type { PkwBuchung, PkwFahrzeug } from "../../../lib/types/pkw";
import type { LagerTeil } from "../../../lib/types/lager";

export default function LagerReservierungenPage() {
  const [teile, setTeile] = useState<LagerTeil[]>([]);
  const [pkwFahrzeuge, setPkwFahrzeuge] = useState<PkwFahrzeug[]>([]);
  const [pkwBuchungen, setPkwBuchungen] = useState<PkwBuchung[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canRead, setCanRead] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [selectedBuchungId, setSelectedBuchungId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const from = new Date();
    from.setDate(from.getDate() - 14);
    const to = new Date();
    to.setDate(to.getDate() + 45);
    const range = buchungRangeParams(dateYmdLocal(from), dateYmdLocal(to));

    const [tRes, fRes, bRes] = await Promise.all([
      fetchLagerTeile(),
      fetchPkwFahrzeuge(),
      fetchPkwBuchungen({ from: range.from, to: range.to }),
    ]);

    if (tRes.error) {
      setLoadError(tRes.error.message);
      setTeile([]);
      setPkwFahrzeuge([]);
      setPkwBuchungen([]);
    } else {
      setTeile(tRes.data ?? []);
      setPkwFahrzeuge(fRes.data ?? []);
      setPkwBuchungen(bRes.data ?? []);
      if (fRes.error || bRes.error) {
        setLoadError(fRes.error ?? bRes.error ?? "PKW-Termine konnten nicht geladen werden.");
      }
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((result) => {
        const perms: string[] = result.permissions ?? [];
        setCanRead(perms.includes("warehouse.read"));
        setCanWrite(perms.includes("warehouse.write") || perms.includes("pkw.service.write"));
      });
  }, []);

  useEffect(() => {
    if (canRead) void load();
    else setLoading(false);
  }, [canRead, load]);

  const rows = useMemo(
    () => buildLagerPkwTerminPartRows(teile, pkwFahrzeuge, pkwBuchungen),
    [teile, pkwFahrzeuge, pkwBuchungen]
  );

  const shortageCount = useMemo(
    () => rows.filter((row) => row.fehlmenge > 0).length,
    [rows]
  );

  const selectedRow = useMemo((): LagerPkwTerminPartRow | null => {
    if (!selectedBuchungId) return null;
    return rows.find((row) => row.buchung.id === selectedBuchungId) ?? null;
  }, [rows, selectedBuchungId]);

  const selectedBuchung = selectedRow?.buchung ?? null;
  const selectedFahrzeug = selectedRow?.fahrzeug ?? null;

  function handleSaved(fahrzeug: PkwFahrzeug) {
    setPkwFahrzeuge((current) =>
      current.map((fz) => (fz.id === fahrzeug.id ? { ...fz, ...fahrzeug } : fz))
    );
    void load();
  }

  return (
    <AppPageShell
      activeHref="/lager/reservierungen"
      contentClassName="lagerReservierungenPage"
      top={
        <header className="pageHeader compactPageHeader">
          <div>
            <h1 style={{ margin: 0 }}>Reservierungen</h1>
            <p className="subtitle" style={{ margin: "6px 0 0" }}>
              PKW-Termine (Portal / Büro) — Ersatzteilbedarf vorbereiten
            </p>
          </div>
          <div className="detailTopActions">
            <Link href="/lager" className="pillButton outline">
              Ersatzteile
            </Link>
            <Link href="/lager/meldungen" className="pillButton outline">
              Meldungen
            </Link>
            <Link href="/lager/bewegungen" className="pillButton outline">
              Bewegungen
            </Link>
          </div>
        </header>
      }
    >
      {loading ? (
        <div className="welcomeCard">
          <h2>Laden…</h2>
        </div>
      ) : !canRead ? (
        <div className="welcomeCard">
          <h2>Kein Zugriff</h2>
          <p>Berechtigung <code>warehouse.read</code> erforderlich.</p>
        </div>
      ) : loadError ? (
        <div className="welcomeCard">
          <h2>Fehler</h2>
          <p>{loadError}</p>
        </div>
      ) : (
        <>
          <div className="lagerMeldungenSummary">
            <span className="lagerMeldungenStat lagerMeldungenStatPkw">
              <strong>{rows.length}</strong> Positionen
            </span>
            <span className="lagerMeldungenStat belowMin">
              <strong>{shortageCount}</strong> Fehlmenge
            </span>
          </div>

          <div className="lagerBewegungenMobileList lagerReservierungenList" aria-label="Reservierungen">
            {rows.length === 0 ? (
              <p className="lagerBewegungenMobileEmpty">
                Keine aktiven PKW-Termine in den nächsten Wochen.
              </p>
            ) : (
              rows.map((row) => (
                <LagerPkwTerminCard
                  key={`${row.buchung.id}-${row.part?.lagerTeilId ?? "empty"}`}
                  row={row}
                  onOpen={setSelectedBuchungId}
                />
              ))
            )}
          </div>
        </>
      )}

      <LagerPkwTerminDetailModal
        open={Boolean(selectedBuchungId && selectedBuchung)}
        buchung={selectedBuchung}
        fahrzeug={selectedFahrzeug}
        canEdit={canWrite}
        onClose={() => setSelectedBuchungId(null)}
        onSaved={handleSaved}
      />
    </AppPageShell>
  );
}
