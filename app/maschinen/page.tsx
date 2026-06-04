"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import AppPageShell from "../components/AppPageShell";
import GeraetenummerFilterPicker from "../components/GeraetenummerFilterPicker";
import GeraetenummerCodesModal from "../components/GeraetenummerCodesModal";
import MachineAddModal from "../components/MachineAddModal";
import MachineList from "../components/MachineList";
import QrScannerModal from "../components/QrScannerModal";
import {
  fetchMachines,
  GERAETTYP_OPTIONS,
  resolveMachineFromScan,
} from "../../lib/machines";
import { supabase } from "../../lib/supabase";
import {
  canMachineCreate,
  canMachineGeraetenummerCodes,
  type SessionAuthSlice,
} from "../../lib/machine-permissions";
import type { Machine } from "../../lib/types/machine";
import {
  DEFAULT_GERAETENUMMER_CODES,
  EMPTY_GERAETENUMMER_FILTER,
  fetchGeraetenummerCodes,
  geraetenummerFilterFromValue,
  machineMatchesGeraetenummerFilter,
  type GeraetenummerCodesConfig,
  type GeraetenummerFilterPick,
} from "../../lib/geraetenummer";

type MachineFilters = {
  geraettyp: string;
  filiale: string;
  meldung: string;
};

const EMPTY_MACHINE_FILTERS: MachineFilters = {
  geraettyp: "",
  filiale: "",
  meldung: "",
};

function MaschinenPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MachineFilters>(EMPTY_MACHINE_FILTERS);
  const [geraetenummerFilter, setGeraetenummerFilter] =
    useState<GeraetenummerFilterPick>(EMPTY_GERAETENUMMER_FILTER);
  const [geraetenummerCodes, setGeraetenummerCodes] =
    useState<GeraetenummerCodesConfig>(DEFAULT_GERAETENUMMER_CODES);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [codesOpen, setCodesOpen] = useState(false);
  const [sessionAuth, setSessionAuth] = useState<SessionAuthSlice>({
    permissions: [],
    groups: [],
  });
  const [authLoaded, setAuthLoaded] = useState(false);
  const canCreateMachine = canMachineCreate(sessionAuth);
  const canGeraetenummerCodes = canMachineGeraetenummerCodes(sessionAuth);

  const loadMachines = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setLoadError(null);

    const { data, error } = await fetchMachines();

    if (error) {
      setLoadError(error.message);
      setMachines([]);
    } else {
      setMachines((data ?? []) as Machine[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadMachines();
  }, [loadMachines]);

  useEffect(() => {
    void fetchGeraetenummerCodes().then(({ data }) => {
      if (data) setGeraetenummerCodes(data);
    });
  }, []);

  useEffect(() => {
    if (!searchParams.has("geraettyp")) return;

    setFilters((current) => ({
      ...current,
      geraettyp: searchParams.get("geraettyp")?.trim() ?? "",
    }));
  }, [searchParams]);

  function clearMaschinenAktion() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("aktion");
    const query = params.toString();
    router.replace(query ? `/maschinen?${query}` : "/maschinen");
  }

  useEffect(() => {
    if (!authLoaded) return;

    const aktion = searchParams.get("aktion");
    if (aktion === "hinzufuegen") {
      if (!canCreateMachine) {
        clearMaschinenAktion();
        return;
      }
      setAddOpen(true);
      setCodesOpen(false);
      setQrOpen(false);
      return;
    }
    if (aktion === "geraetenummer-codes") {
      if (!canGeraetenummerCodes) {
        clearMaschinenAktion();
        return;
      }
      setCodesOpen(true);
      setAddOpen(false);
      setQrOpen(false);
      return;
    }
    if (aktion === "qr") {
      setQrOpen(true);
      setAddOpen(false);
      setCodesOpen(false);
      return;
    }
    setQrOpen(false);
    setAddOpen(false);
    setCodesOpen(false);
  }, [searchParams, authLoaded, canCreateMachine, canGeraetenummerCodes]);

  useEffect(() => {
    async function loadPermissions() {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      setSessionAuth({
        permissions: result.permissions ?? [],
        groups: result.groups ?? [],
        username: result.username ?? result.user?.username,
      });
      setAuthLoaded(true);
    }

    loadPermissions();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("maschines-page-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "maschines" },
        () => {
          loadMachines({ silent: true });
        }
      )
      .subscribe();

    const refreshInterval = window.setInterval(() => {
      loadMachines({ silent: true });
    }, 5000);

    return () => {
      window.clearInterval(refreshInterval);
      supabase.removeChannel(channel);
    };
  }, [loadMachines]);

  const filteredMachines = useMemo(() => {
    const qTyp = filters.geraettyp.trim().toLowerCase();
    const qFiliale = filters.filiale.trim().toLowerCase();
    const qMeldung = filters.meldung.trim().toLowerCase();

    return machines.filter((machine) => {
      if (
        !machineMatchesGeraetenummerFilter(machine.geraetenummer, geraetenummerFilter)
      ) {
        return false;
      }

      if (qTyp && String(machine.geraettyp ?? "").toLowerCase() !== qTyp) {
        return false;
      }

      if (qFiliale && !String(machine.depot ?? "").toLowerCase().includes(qFiliale)) {
        return false;
      }

      const meldungRaw = String(machine.meldung_status ?? "").toLowerCase();
      if (qMeldung === "mit" && !meldungRaw.includes("vorhanden")) return false;
      if (qMeldung === "ohne" && meldungRaw.includes("vorhanden")) return false;

      return true;
    });
  }, [filters, geraetenummerFilter, machines]);

  const filialeOptions = useMemo(() => {
    return Array.from(
      new Set(
        machines
          .map((machine) => String(machine.depot ?? "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b, "de"));
  }, [machines]);

  function openMachine(machine: Machine) {
    setScanHint(null);
    router.push(`/maschinen/${machine.id}`);
  }

  function handleScan(value: string) {
    const match = resolveMachineFromScan(machines, value);
    if (match) {
      openMachine(match);
      return;
    }
    setScanHint(`Keine Maschine zu diesem Code: „${value}”`);
    setGeraetenummerFilter(geraetenummerFilterFromValue(value));
  }

  function resetFilters() {
    setFilters(EMPTY_MACHINE_FILTERS);
    setGeraetenummerFilter(EMPTY_GERAETENUMMER_FILTER);
    setScanHint(null);
  }

  function updateFilter<K extends keyof MachineFilters>(key: K, value: MachineFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setScanHint(null);
  }

  async function handleMachineCreated(machine: Machine) {
    setAddOpen(false);
    if (searchParams.get("aktion") === "hinzufuegen") clearMaschinenAktion();
    await loadMachines();
    router.push(`/maschinen/${machine.id}?edit=1`);
  }

  return (
    <AppPageShell activeHref="/maschinen">
        {loading ? (
          <div className="welcomeCard">
            <h1>Laden…</h1>
          </div>
        ) : loadError ? (
          <div className="welcomeCard">
            <h1>Fehler</h1>
            <p>{loadError}</p>
            <p>
              Fuehren Sie <code>supabase/consolidate-schema.sql</code> im Supabase SQL Editor aus
              (nur eine Tabelle: <code>maschines</code>, nicht <code>machines</code>).
            </p>
          </div>
        ) : (
          <>
            <div className="searchToolbar card maschinenFiltersBar">
              <div className="arbeitsauftragFilterField maschinenFilterGeraetenummer">
                <span>Gerätenummer</span>
                <GeraetenummerFilterPicker
                  codes={geraetenummerCodes}
                  value={geraetenummerFilter}
                  onChange={(next) => {
                    setGeraetenummerFilter(next);
                    setScanHint(null);
                  }}
                />
              </div>
              <label className="arbeitsauftragFilterField">
                <span>Gerättyp</span>
                <select
                  value={filters.geraettyp}
                  onChange={(event) => updateFilter("geraettyp", event.target.value)}
                >
                  <option value="">Alle</option>
                  {GERAETTYP_OPTIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="arbeitsauftragFilterField">
                <span>Filiale</span>
                <select
                  value={filters.filiale}
                  onChange={(event) => updateFilter("filiale", event.target.value)}
                >
                  <option value="">Alle</option>
                  {filialeOptions.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
              <label className="arbeitsauftragFilterField">
                <span>Meldung</span>
                <select
                  value={filters.meldung}
                  onChange={(event) => updateFilter("meldung", event.target.value)}
                >
                  <option value="">Alle</option>
                  <option value="mit">Mit Meldung</option>
                  <option value="ohne">Ohne Meldung</option>
                </select>
              </label>
              <button
                type="button"
                className="pillButton outline arbeitsauftragFilterReset"
                onClick={resetFilters}
              >
                Zurücksetzen
              </button>
            </div>

            {scanHint ? (
              <p className="scanHint" role="status">
                {scanHint}
              </p>
            ) : null}

            <MachineList machines={filteredMachines} />
          </>
        )}

      <QrScannerModal
        open={qrOpen}
        onClose={() => {
          setQrOpen(false);
          if (searchParams.get("aktion") === "qr") clearMaschinenAktion();
        }}
        onScan={handleScan}
      />

      <MachineAddModal
        open={addOpen}
        canCreate={canCreateMachine}
        sessionAuth={sessionAuth}
        onClose={() => {
          setAddOpen(false);
          if (searchParams.get("aktion") === "hinzufuegen") clearMaschinenAktion();
        }}
        onSaved={handleMachineCreated}
      />

      <GeraetenummerCodesModal
        open={codesOpen}
        canWrite={canGeraetenummerCodes}
        onClose={() => {
          setCodesOpen(false);
          if (searchParams.get("aktion") === "geraetenummer-codes") clearMaschinenAktion();
        }}
      />
    </AppPageShell>
  );
}

export default function MaschinenPage() {
  return (
    <Suspense
      fallback={
        <AppPageShell activeHref="/maschinen">
          <div className="welcomeCard">
            <h1>Laden…</h1>
          </div>
        </AppPageShell>
      }
    >
      <MaschinenPageContent />
    </Suspense>
  );
}
