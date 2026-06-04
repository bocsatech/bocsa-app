"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppPageShell from "../../components/AppPageShell";
import LagerPkwTerminCard from "../../components/LagerPkwTerminCard";
import LagerPkwTerminFilterBar from "../../components/LagerPkwTerminFilterBar";
import PkwBuchungEditModal from "../../components/PkwBuchungEditModal";
import {
  buildLagerPkwTerminPartRows,
  fetchLagerPkwFahrzeuge,
  fetchLagerPkwTermin,
  fetchLagerPkwTermine,
  pkwTerminZeitraumRange,
  type LagerPkwTerminPartRow,
  type PkwTerminZeitraumPreset,
} from "../../../lib/lager-pkw-termine";
import { fetchLagerTeile } from "../../../lib/lager";
import { dateYmdLocal, fetchPkwServicearten } from "../../../lib/pkw";
import type { PkwBuchung, PkwFahrzeug, PkwServiceArt } from "../../../lib/types/pkw";
import type { LagerTeil } from "../../../lib/types/lager";

function defaultZeitraum() {
  const from = new Date();
  from.setDate(from.getDate() - 14);
  const to = new Date();
  to.setDate(to.getDate() + 45);
  return { von: dateYmdLocal(from), bis: dateYmdLocal(to) };
}

export default function LagerReservierungenPage() {
  const today = dateYmdLocal();
  const initialRange = defaultZeitraum();
  const [teile, setTeile] = useState<LagerTeil[]>([]);
  const [pkwFahrzeuge, setPkwFahrzeuge] = useState<PkwFahrzeug[]>([]);
  const [pkwBuchungen, setPkwBuchungen] = useState<PkwBuchung[]>([]);
  const [servicearten, setServicearten] = useState<PkwServiceArt[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canRead, setCanRead] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [selectedBuchungId, setSelectedBuchungId] = useState<string | null>(null);
  const [modalBuchung, setModalBuchung] = useState<PkwBuchung | null>(null);

  const [preset, setPreset] = useState<PkwTerminZeitraumPreset>("zeitraum");
  const [filterTag, setFilterTag] = useState(today);
  const [filterMonat, setFilterMonat] = useState(today.slice(0, 7));
  const [filterJahr, setFilterJahr] = useState(String(new Date().getFullYear()));
  const [filterVon, setFilterVon] = useState(initialRange.von);
  const [filterBis, setFilterBis] = useState(initialRange.bis);

  const range = useMemo(
    () =>
      pkwTerminZeitraumRange(preset, {
        tag: filterTag,
        monat: filterMonat,
        jahr: filterJahr,
        von: filterVon,
        bis: filterBis,
      }),
    [preset, filterTag, filterMonat, filterJahr, filterVon, filterBis]
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const [tRes, fRes, bRes, sRes] = await Promise.all([
      fetchLagerTeile(),
      fetchLagerPkwFahrzeuge(),
      fetchLagerPkwTermine({ from: range.from, to: range.to }),
      fetchPkwServicearten(),
    ]);

    if (tRes.error) {
      setLoadError(tRes.error.message);
      setTeile([]);
      setPkwFahrzeuge([]);
      setPkwBuchungen([]);
      setServicearten([]);
    } else {
      setTeile(tRes.data ?? []);
      setPkwFahrzeuge(fRes.data ?? []);
      setPkwBuchungen(bRes.data ?? []);
      if (sRes.data) setServicearten(sRes.data);
      if (fRes.error || bRes.error) {
        setLoadError(fRes.error ?? bRes.error ?? "PKW-Termine konnten nicht geladen werden.");
      }
    }

    setLoading(false);
  }, [range.from, range.to]);

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

  useEffect(() => {
    if (!selectedBuchungId) {
      setModalBuchung(null);
      return;
    }

    const cached = pkwBuchungen.find((b) => b.id === selectedBuchungId);
    if (cached) {
      setModalBuchung(cached);
      return;
    }

    void fetchLagerPkwTermin(selectedBuchungId).then(({ data, error }) => {
      if (data) setModalBuchung(data);
      else if (error) setLoadError(error);
    });
  }, [selectedBuchungId, pkwBuchungen]);

  const rows = useMemo(
    () => buildLagerPkwTerminPartRows(teile, pkwFahrzeuge, pkwBuchungen),
    [teile, pkwFahrzeuge, pkwBuchungen]
  );

  const shortageCount = useMemo(
    () => rows.filter((row) => row.fehlmenge > 0).length,
    [rows]
  );

  function handleBuchungSaved(buchung: PkwBuchung) {
    setPkwBuchungen((current) => {
      const idx = current.findIndex((b) => b.id === buchung.id);
      if (idx >= 0) {
        const next = [...current];
        next[idx] = buchung;
        return next;
      }
      return [...current, buchung].sort((a, b) => a.slot_start.localeCompare(b.slot_start));
    });
    setModalBuchung(buchung);
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
              PKW-Termine — Ersatzteilbedarf vorbereiten ({range.label})
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
      <LagerPkwTerminFilterBar
        preset={preset}
        onPresetChange={setPreset}
        tag={filterTag}
        onTagChange={setFilterTag}
        monat={filterMonat}
        onMonatChange={setFilterMonat}
        jahr={filterJahr}
        onJahrChange={setFilterJahr}
        von={filterVon}
        onVonChange={setFilterVon}
        bis={filterBis}
        onBisChange={setFilterBis}
      />

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
                Keine aktiven PKW-Termine im gewählten Zeitraum.
              </p>
            ) : (
              rows.map((row: LagerPkwTerminPartRow) => (
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

      <PkwBuchungEditModal
        open={Boolean(modalBuchung)}
        buchung={modalBuchung}
        servicearten={servicearten}
        fahrzeuge={pkwFahrzeuge}
        canWrite={canWrite}
        onClose={() => setSelectedBuchungId(null)}
        onSaved={handleBuchungSaved}
        onServiceartenChange={setServicearten}
      />
    </AppPageShell>
  );
}
