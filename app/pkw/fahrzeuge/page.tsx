"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import AppPageShell from "../../components/AppPageShell";
import PkwFahrzeugList from "../../components/PkwFahrzeugList";
import PkwFahrzeugModal from "../../components/PkwFahrzeugModal";
import {
  buchungRangeParams,
  dateYmdLocal,
  fetchKunden,
  fetchPkwBuchungen,
  fetchPkwFahrzeuge,
  formatKundeName,
} from "../../../lib/pkw";
import { hasPkwKundenRead, hasPkwKundenWrite, hasPkwServiceRead } from "../../../lib/pkw-permissions";
import type { Kunde, PkwBuchung, PkwFahrzeug } from "../../../lib/types/pkw";

type FahrzeugFilters = {
  kennzeichen: string;
  gruppe: string;
  marke: string;
  modell: string;
  kunde: string;
};

const EMPTY_FILTERS: FahrzeugFilters = {
  kennzeichen: "",
  gruppe: "",
  marke: "",
  modell: "",
  kunde: "",
};

function PkwFahrzeugePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fahrzeuge, setFahrzeuge] = useState<PkwFahrzeug[]>([]);
  const [buchungen, setBuchungen] = useState<PkwBuchung[]>([]);
  const [kunden, setKunden] = useState<Kunde[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FahrzeugFilters>(EMPTY_FILTERS);
  const [canRead, setCanRead] = useState(false);
  const [canWrite, setCanWrite] = useState(false);
  const [canReadService, setCanReadService] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setError(null);

    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);
    const range = buchungRangeParams(dateYmdLocal(from), dateYmdLocal());

    const requests: [
      ReturnType<typeof fetchPkwFahrzeuge>,
      ReturnType<typeof fetchKunden>,
      ReturnType<typeof fetchPkwBuchungen> | Promise<{ data: PkwBuchung[] | null; error: string | null }>,
    ] = [
      fetchPkwFahrzeuge(),
      fetchKunden(),
      canReadService
        ? fetchPkwBuchungen({ from: range.from, to: range.to })
        : Promise.resolve({ data: [], error: null }),
    ];

    const [fRes, kRes, bRes] = await Promise.all(requests);

    if (fRes.error) setError(fRes.error);
    else setFahrzeuge(fRes.data ?? []);
    if (!kRes.error) setKunden(kRes.data ?? []);
    setBuchungen(bRes.data ?? []);
    if (!options?.silent) setLoading(false);
  }, [canReadService]);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store", credentials: "include" })
      .then((r) => r.json())
      .then((result) => {
        const perms = result.permissions ?? [];
        const groups = result.groups ?? [];
        const username = result.username ?? result.user?.username;
        setCanRead(hasPkwKundenRead(perms, groups, username));
        setCanWrite(hasPkwKundenWrite(perms, groups, username));
        setCanReadService(hasPkwServiceRead(perms, groups, username));
      })
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (canRead) load();
    else setLoading(false);
  }, [canRead, load]);

  useEffect(() => {
    if (!authChecked) return;

    const aktion = searchParams.get("aktion");
    if (aktion === "hinzufuegen") {
      if (!canWrite) {
        clearAktion();
        return;
      }
      setModalOpen(true);
      return;
    }

    setModalOpen(false);
  }, [searchParams, authChecked, canWrite]);

  function clearAktion() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("aktion");
    const query = params.toString();
    router.replace(query ? `/pkw/fahrzeuge?${query}` : "/pkw/fahrzeuge");
  }

  function closeModal() {
    setModalOpen(false);
    if (searchParams.get("aktion") === "hinzufuegen") clearAktion();
  }

  const filtered = useMemo(() => {
    const qKz = filters.kennzeichen.trim().toLowerCase();
    const qGruppe = filters.gruppe.trim().toLowerCase();
    const qMarke = filters.marke.trim().toLowerCase();
    const qModell = filters.modell.trim().toLowerCase();
    const qKunde = filters.kunde.trim().toLowerCase();

    return fahrzeuge.filter((fz) => {
      if (qKz && !fz.kennzeichen.toLowerCase().includes(qKz) && !String(fz.fin ?? "").toLowerCase().includes(qKz)) {
        return false;
      }
      if (qGruppe && String(fz.gruppe ?? "").toLowerCase() !== qGruppe.toLowerCase()) return false;
      if (qMarke && !String(fz.marke ?? "").toLowerCase().includes(qMarke)) return false;
      if (qModell && !String(fz.modell ?? "").toLowerCase().includes(qModell)) return false;
      if (qKunde) {
        const name = fz.kunde ? formatKundeName(fz.kunde).toLowerCase() : "";
        if (!name.includes(qKunde)) return false;
      }
      return true;
    });
  }, [fahrzeuge, filters]);

  const gruppeOptions = useMemo(() => {
    return Array.from(new Set(fahrzeuge.map((fz) => String(fz.gruppe ?? "").trim()).filter(Boolean))).sort(
      (a, b) => a.localeCompare(b, "de")
    );
  }, [fahrzeuge]);

  function updateFilter<K extends keyof FahrzeugFilters>(key: K, value: FahrzeugFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  if (!authChecked) {
    return (
      <AppPageShell activeHref="/pkw/fahrzeuge" subtitle="PKW">
        <p className="subtitle">Laden…</p>
      </AppPageShell>
    );
  }

  if (!canRead) {
    return (
      <AppPageShell activeHref="/pkw/fahrzeuge" subtitle="PKW">
        <p className="errorText">Keine Berechtigung: pkw.kunden.read</p>
      </AppPageShell>
    );
  }

  return (
    <AppPageShell activeHref="/pkw/fahrzeuge" subtitle="PKW" title="Fahrzeuge">
      {loading ? (
        <div className="welcomeCard">
          <h1>Laden…</h1>
        </div>
      ) : error ? (
        <div className="welcomeCard">
          <h1>Fehler</h1>
          <p className="errorText">{error}</p>
        </div>
      ) : (
        <>
          <div className="searchToolbar card maschinenFiltersBar">
            <label className="arbeitsauftragFilterField">
              <span>Kennzeichen</span>
              <input
                type="search"
                value={filters.kennzeichen}
                onChange={(e) => updateFilter("kennzeichen", e.target.value)}
                placeholder="z. B. W 1234 AB"
                autoComplete="off"
              />
            </label>
            <label className="arbeitsauftragFilterField">
              <span>PKW-Gruppe</span>
              <select value={filters.gruppe} onChange={(e) => updateFilter("gruppe", e.target.value)}>
                <option value="">Alle</option>
                {gruppeOptions.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
            <label className="arbeitsauftragFilterField">
              <span>Marke</span>
              <input
                type="search"
                value={filters.marke}
                onChange={(e) => updateFilter("marke", e.target.value)}
                placeholder="VW"
              />
            </label>
            <label className="arbeitsauftragFilterField">
              <span>Modell</span>
              <input
                type="search"
                value={filters.modell}
                onChange={(e) => updateFilter("modell", e.target.value)}
                placeholder="Golf"
              />
            </label>
            <label className="arbeitsauftragFilterField">
              <span>Kunde</span>
              <input
                type="search"
                value={filters.kunde}
                onChange={(e) => updateFilter("kunde", e.target.value)}
                placeholder="Name oder Firma"
              />
            </label>
            <button
              type="button"
              className="pillButton outline arbeitsauftragFilterReset"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Zurücksetzen
            </button>
          </div>

          <PkwFahrzeugList fahrzeuge={filtered} buchungen={buchungen} />
        </>
      )}

      {modalOpen ? (
        <PkwFahrzeugModal
          kunde={null}
          kunden={kunden}
          fahrzeug={null}
          onClose={closeModal}
          onSaved={(fz) => {
            setFahrzeuge((cur) =>
              [...cur, fz].sort((a, b) => a.kennzeichen.localeCompare(b.kennzeichen, "de"))
            );
            closeModal();
            router.push(`/pkw/fahrzeuge/${fz.id}`);
          }}
        />
      ) : null}
    </AppPageShell>
  );
}

export default function PkwFahrzeugePage() {
  return (
    <Suspense
      fallback={
        <AppPageShell activeHref="/pkw/fahrzeuge" subtitle="PKW">
          <div className="welcomeCard">
            <h1>Laden…</h1>
          </div>
        </AppPageShell>
      }
    >
      <PkwFahrzeugePageContent />
    </Suspense>
  );
}
