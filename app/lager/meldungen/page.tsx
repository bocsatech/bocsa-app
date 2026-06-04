"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import AppPageShell from "../../components/AppPageShell";
import LagerBestandBadge from "../../components/LagerBestandBadge";
import LagerBewegungReferenzLink from "../../components/LagerBewegungReferenzLink";
import LagerPkwTerminDetailModal from "../../components/LagerPkwTerminDetailModal";
import {
  bewegungTypLabel,
  buildLagerFahrzeugBedarf,
  fetchLagerBewegungen,
  fetchLagerTeile,
  formatBewegungDatum,
  formatLagerNumber,
  formatLagerValue,
  getLagerBestandMeldungen,
  lagerBewegungZeitraumRange,
  type LagerBewegung,
} from "../../../lib/lager";
import {
  buildFahrzeugLookupMaps,
  resolveFahrzeugForBuchung,
} from "../../../lib/lager-pkw-bedarf";
import { buchungRangeParams, dateYmdLocal, fetchPkwBuchungen, fetchPkwFahrzeuge } from "../../../lib/pkw";
import type { LagerFahrzeugBedarfZeile } from "../../../lib/lager-pkw-bedarf";
import type { LagerBestandMeldung } from "../../../lib/lager-bestand";
import type { PkwBuchung, PkwFahrzeug } from "../../../lib/types/pkw";
import type { LagerTeil } from "../../../lib/types/lager";

export default function LagerMeldungenPage() {
  const [teile, setTeile] = useState<LagerTeil[]>([]);
  const [pkwFahrzeuge, setPkwFahrzeuge] = useState<PkwFahrzeug[]>([]);
  const [pkwBuchungen, setPkwBuchungen] = useState<PkwBuchung[]>([]);
  const [heuteBewegungen, setHeuteBewegungen] = useState<LagerBewegung[]>([]);
  const [bewegungenError, setBewegungenError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canRead, setCanRead] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [selectedBuchungId, setSelectedBuchungId] = useState<string | null>(null);

  const heuteRange = useMemo(() => lagerBewegungZeitraumRange("tag"), []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const from = new Date();
    from.setDate(from.getDate() - 14);
    const to = new Date();
    to.setDate(to.getDate() + 45);
    const range = buchungRangeParams(dateYmdLocal(from), dateYmdLocal(to));

    const [tRes, fRes, bRes, mRes] = await Promise.all([
      fetchLagerTeile(),
      fetchPkwFahrzeuge(),
      fetchPkwBuchungen({ from: range.from, to: range.to }),
      fetchLagerBewegungen({ from: heuteRange.from, to: heuteRange.to }),
    ]);

    if (tRes.error) {
      setLoadError(tRes.error.message);
      setTeile([]);
      setPkwFahrzeuge([]);
      setPkwBuchungen([]);
      setHeuteBewegungen([]);
      setBewegungenError(mRes.error?.message ?? null);
    } else {
      setTeile(tRes.data ?? []);
      setPkwFahrzeuge(fRes.data ?? []);
      setPkwBuchungen(bRes.data ?? []);
      setHeuteBewegungen(mRes.data ?? []);
      setBewegungenError(mRes.error?.message ?? null);
      if (fRes.error || bRes.error) {
        setLoadError(fRes.error ?? bRes.error ?? "PKW-Termine konnten nicht geladen werden.");
      }
    }

    setLoading(false);
  }, [heuteRange.from, heuteRange.to]);

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

  const bestandMeldungen = useMemo(() => getLagerBestandMeldungen(teile), [teile]);
  const fahrzeugBedarf = useMemo(
    () => buildLagerFahrzeugBedarf(teile, pkwFahrzeuge, pkwBuchungen),
    [teile, pkwFahrzeuge, pkwBuchungen]
  );

  const belowCount = bestandMeldungen.filter((m) => m.kind === "below_min").length;
  const aboveCount = bestandMeldungen.filter((m) => m.kind === "above_max").length;

  const heuteSummary = useMemo(() => {
    let aus = 0;
    let ein = 0;
    for (const row of heuteBewegungen) {
      if (row.richtung === "ein") ein += row.menge;
      else aus += row.menge;
    }
    return { aus, ein, count: heuteBewegungen.length };
  }, [heuteBewegungen]);

  const selectedBuchung = useMemo(
    () => pkwBuchungen.find((b) => b.id === selectedBuchungId) ?? null,
    [pkwBuchungen, selectedBuchungId]
  );

  const selectedFahrzeug = useMemo(() => {
    if (!selectedBuchung) return null;
    const lookup = buildFahrzeugLookupMaps(pkwFahrzeuge);
    return (
      resolveFahrzeugForBuchung(selectedBuchung, lookup) ?? selectedBuchung.fahrzeug ?? null
    );
  }, [selectedBuchung, pkwFahrzeuge]);

  function handleTerminSaved(fahrzeug: PkwFahrzeug) {
    setPkwFahrzeuge((current) =>
      current.map((fz) => (fz.id === fahrzeug.id ? { ...fz, ...fahrzeug } : fz))
    );
    void load();
  }

  return (
    <AppPageShell
      activeHref="/lager/meldungen"
      top={
        <header className="pageHeader compactPageHeader">
          <div>
            <h1 style={{ margin: 0 }}>Lager-Meldungen</h1>
            <p className="subtitle" style={{ margin: "6px 0 0" }}>
              PKW-Bedarf (QR-Termine) und Mindest-/Maximalbestand.
            </p>
          </div>
          <div className="detailTopActions">
            <Link href="/lager" className="pillButton outline">
              Ersatzteile
            </Link>
            <Link href="/lager/bewegungen" className="pillButton outline">
              Bewegungen
            </Link>
            <Link href="/lager/inventur" className="pillButton outline">
              Inventur
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
          <p className="scanHint">
            SQL: <code>supabase/lager-menge-grenzen.sql</code>,{" "}
            <code>supabase/lager-bewegungen-erweiterung.sql</code>
          </p>
        </div>
      ) : (
        <>
          <div className="lagerMeldungenSummary">
            <span className="lagerMeldungenStat lagerMeldungenStatPkw">
              <strong>{fahrzeugBedarf.length}</strong> PKW-Bedarf
            </span>
            <span className="lagerMeldungenStat belowMin">
              <strong>{belowCount}</strong> Mindestmenge
            </span>
            <span className="lagerMeldungenStat aboveMax">
              <strong>{aboveCount}</strong> Maximalmenge
            </span>
            <span className="lagerMeldungenStat">
              <strong>{heuteSummary.count}</strong> Bewegungen heute
            </span>
          </div>

          {bewegungenError ? (
            <p className="protocolNotice" role="alert">
              Tagesbewegungen: {bewegungenError} — ggf. im Supabase SQL Editor{" "}
              <code>supabase/lager-bewegungen-setup.sql</code> ausführen.
            </p>
          ) : null}

          <MeldungenSection
            title="Heute — Lagerbewegungen"
            empty="Heute noch keine Entnahmen oder Inventur-Buchungen."
            isEmpty={heuteBewegungen.length === 0}
          >
            <p className="lagerMeldungenInlineSummary scanHint">
              Ausgang: <strong>{formatLagerNumber(heuteSummary.aus)}</strong> · Eingang:{" "}
              <strong>{formatLagerNumber(heuteSummary.ein)}</strong> —{" "}
              <Link href="/lager/bewegungen">Woche / Monat / Zeitraum</Link>
            </p>
            <table className="machineTable lagerTable">
              <thead>
                <tr>
                  <th>Zeit</th>
                  <th>Typ</th>
                  <th>Herstellernummer</th>
                  <th>Menge</th>
                  <th>Referenz</th>
                </tr>
              </thead>
              <tbody>
                {heuteBewegungen.slice(0, 25).map((row) => (
                  <tr
                    key={row.id}
                    className={row.richtung === "ein" ? "lagerBewegungEin" : "lagerBewegungAus"}
                  >
                    <td>{formatBewegungDatum(row.created_at)}</td>
                    <td>{bewegungTypLabel(row.typ, row.richtung)}</td>
                    <td>
                      <strong>{formatLagerValue(row.teil?.herstellernummer)}</strong>
                    </td>
                    <td>{formatLagerNumber(row.menge)}</td>
                    <td>
                      <LagerBewegungReferenzLink row={row} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {heuteBewegungen.length > 25 ? (
              <p className="lagerMeldungenEmpty">
                +{heuteBewegungen.length - 25} weitere —{" "}
                <Link href="/lager/bewegungen">alle anzeigen</Link>
              </p>
            ) : null}
          </MeldungenSection>

          <MeldungenSection
            title="PKW — Ersatzteilbedarf (QR / Portal-Termine)"
            empty="Keine unterdeckten Teile für aktive PKW-Termine."
            isEmpty={fahrzeugBedarf.length === 0}
          >
            <p className="lagerMeldungenInlineSummary scanHint">
              <Link href="/lager/reservierungen">Alle Reservierungen (Karten)</Link> — Termin
              öffnen und Ersatzteile ergänzen.
            </p>
            <table className="machineTable lagerTable">
              <thead>
                <tr>
                  <th>Herstellernummer</th>
                  <th>Ersatzteil</th>
                  <th>Bedarf</th>
                  <th>Lagerstand</th>
                  <th>Fehlmenge</th>
                  <th>Fahrzeuge / Termine</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {fahrzeugBedarf.map((row) => (
                  <FahrzeugBedarfRow
                    key={row.teil.id}
                    row={row}
                    onOpenTermin={setSelectedBuchungId}
                  />
                ))}
              </tbody>
            </table>
          </MeldungenSection>

          <MeldungenSection
            title="Bestand — Mindest- & Maximalmenge"
            empty="Keine Grenzwert-Meldungen."
            isEmpty={bestandMeldungen.length === 0}
          >
            <table className="machineTable lagerTable">
              <thead>
                <tr>
                  <th>Meldung</th>
                  <th>Herstellernummer</th>
                  <th>Ersatzteil</th>
                  <th>Lagerstand</th>
                  <th>Min.</th>
                  <th>Max.</th>
                  <th>Grenze</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {bestandMeldungen.map((row) => (
                  <BestandRow key={`${row.teil.id}-${row.kind}`} row={row} />
                ))}
              </tbody>
            </table>
          </MeldungenSection>
        </>
      )}

      <LagerPkwTerminDetailModal
        open={Boolean(selectedBuchungId && selectedBuchung)}
        buchung={selectedBuchung}
        fahrzeug={selectedFahrzeug}
        canEdit={canWrite}
        onClose={() => setSelectedBuchungId(null)}
        onSaved={handleTerminSaved}
      />
    </AppPageShell>
  );
}

function MeldungenSection({
  title,
  empty,
  isEmpty,
  children,
}: {
  title: string;
  empty: string;
  isEmpty: boolean;
  children: import("react").ReactNode;
}) {
  return (
    <article className="card machineTableWrap lagerMeldungenSection">
      <h2 className="lagerTableSectionTitle">{title}</h2>
      {isEmpty ? <p className="lagerMeldungenEmpty">{empty}</p> : <div className="machineTableScroll">{children}</div>}
    </article>
  );
}

function FahrzeugBedarfRow({
  row,
  onOpenTermin,
}: {
  row: LagerFahrzeugBedarfZeile;
  onOpenTermin: (buchungId: string) => void;
}) {
  const { teil, bedarfMenge, lagerstand, fehlmenge, fahrzeuge } = row;
  const primaryBuchungId = fahrzeuge.length === 1 ? fahrzeuge[0]?.buchungId : null;

  return (
    <tr className="lagerMeldungRowBelow">
      <td>
        <strong>{formatLagerValue(teil.herstellernummer)}</strong>
      </td>
      <td className="lagerBezeichnungCell">{teil.bezeichnung?.trim() ?? ""}</td>
      <td>{formatLagerNumber(bedarfMenge)}</td>
      <td>{formatLagerNumber(lagerstand)}</td>
      <td>
        <strong className="lagerFehlmenge">{formatLagerNumber(fehlmenge)}</strong>
      </td>
      <td className="lagerFahrzeugListeCell">
        {fahrzeuge.map((fz) => (
          <button
            key={fz.buchungId}
            type="button"
            className="lagerTerminLink"
            onClick={() => onOpenTermin(fz.buchungId)}
          >
            {fz.kennzeichen}
            {fz.slotStart
              ? ` · ${new Date(fz.slotStart).toLocaleString("de-AT", { dateStyle: "short", timeStyle: "short" })}`
              : ""}
            {fz.source === "portal" ? " · Portal" : ""}
          </button>
        ))}
      </td>
      <td>
        <div className="lagerMeldungRowActions">
          {primaryBuchungId ? (
            <button
              type="button"
              className="pillButton primary"
              onClick={() => onOpenTermin(primaryBuchungId)}
            >
              Termin öffnen
            </button>
          ) : null}
          <Link className="pillButton outline" href={`/lager?teil=${encodeURIComponent(teil.id)}`}>
            Teil öffnen
          </Link>
        </div>
      </td>
    </tr>
  );
}

function BestandRow({ row }: { row: LagerBestandMeldung }) {
  const { teil, kind, grenze, lagerstand } = row;
  return (
    <tr className={kind === "below_min" ? "lagerMeldungRowBelow" : "lagerMeldungRowAbove"}>
      <td>
        <LagerBestandBadge teil={teil} />
      </td>
      <td>
        <strong>{formatLagerValue(teil.herstellernummer)}</strong>
      </td>
      <td className="lagerBezeichnungCell">{teil.bezeichnung?.trim() ?? ""}</td>
      <td>{formatLagerNumber(lagerstand)}</td>
      <td className={kind === "below_min" ? "lagerGrenzeValueWarn" : ""}>
        {formatLagerNumber(teil.menge_min)}
        {kind === "below_min" ? <span className="lagerGrenzeWarnMark"> ⚠</span> : null}
      </td>
      <td>{formatLagerNumber(teil.menge_max)}</td>
      <td>{formatLagerNumber(grenze)}</td>
      <td>
        <Link className="pillButton outline" href={`/lager?teil=${encodeURIComponent(teil.id)}`}>
          Teil öffnen
        </Link>
      </td>
    </tr>
  );
}
