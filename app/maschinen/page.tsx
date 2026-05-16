"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import AppPageShell from "../components/AppPageShell";
import MachineList from "../components/MachineList";
import QrScannerModal from "../components/QrScannerModal";
import {
  createMachine,
  fetchMachines,
  GERAETTYP_OPTIONS,
  MACHINE_FORM_FIELDS,
  resolveMachineFromScan,
  toIsoDateString,
} from "../../lib/machines";
import { supabase } from "../../lib/supabase";
import type { Machine } from "../../lib/types/machine";

type MachineFilters = {
  geraetenummer: string;
  geraettyp: string;
  filiale: string;
  meldung: string;
  bezeichnung: string;
};

const EMPTY_MACHINE_FILTERS: MachineFilters = {
  geraetenummer: "",
  geraettyp: "",
  filiale: "",
  meldung: "",
  bezeichnung: "",
};

function MaschinenPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filters, setFilters] = useState<MachineFilters>(EMPTY_MACHINE_FILTERS);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [canWriteMachines, setCanWriteMachines] = useState(false);
  const [machineForm, setMachineForm] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savingMachine, setSavingMachine] = useState(false);

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
    const geraettyp = searchParams.get("geraettyp");
    const geraetenummer = searchParams.get("geraetenummer");
    if (!geraettyp && !geraetenummer) return;

    setFilters((current) => ({
      ...current,
      ...(geraettyp ? { geraettyp } : {}),
      ...(geraetenummer ? { geraetenummer } : {}),
    }));
  }, [searchParams]);

  useEffect(() => {
    async function loadPermissions() {
      const response = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      setCanWriteMachines(Boolean(result.permissions?.includes("machines.write")));
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
    const qGeraet = filters.geraetenummer.trim().toLowerCase();
    const qTyp = filters.geraettyp.trim().toLowerCase();
    const qFiliale = filters.filiale.trim().toLowerCase();
    const qBezeichnung = filters.bezeichnung.trim().toLowerCase();
    const qMeldung = filters.meldung.trim().toLowerCase();

    return machines.filter((machine) => {
      if (
        qGeraet &&
        !String(machine.geraetenummer ?? "").toLowerCase().includes(qGeraet) &&
        !String(machine.serial_number ?? "").toLowerCase().includes(qGeraet)
      ) {
        return false;
      }

      if (qTyp && String(machine.geraettyp ?? "").toLowerCase() !== qTyp) {
        return false;
      }

      if (qFiliale && !String(machine.depot ?? "").toLowerCase().includes(qFiliale)) {
        return false;
      }

      if (qBezeichnung && !String(machine.bezeichnung ?? "").toLowerCase().includes(qBezeichnung)) {
        return false;
      }

      const meldungRaw = String(machine.meldung_status ?? "").toLowerCase();
      if (qMeldung === "mit" && !meldungRaw.includes("vorhanden")) return false;
      if (qMeldung === "ohne" && meldungRaw.includes("vorhanden")) return false;

      return true;
    });
  }, [filters, machines]);

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
    setScanHint(`Nem található gép ehhez a kódhoz: „${value}”`);
    setFilters((current) => ({ ...current, geraetenummer: value }));
  }

  function updateFilter<K extends keyof MachineFilters>(key: K, value: MachineFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
    setScanHint(null);
  }

  async function handleCreateMachine(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canWriteMachines) {
      setFormError("Keine Berechtigung: machines.write erforderlich.");
      return;
    }

    setSavingMachine(true);
    setFormError(null);

    const payload: Record<string, string | number | null> = {};
    for (const field of MACHINE_FORM_FIELDS) {
      const value = machineForm[String(field.key)]?.trim() ?? "";
      if (!value) {
        continue;
      } else if (field.type === "number") {
        payload[String(field.key)] = Number(value);
      } else if (field.type === "date") {
        payload[String(field.key)] = toIsoDateString(value) || value;
      } else {
        payload[String(field.key)] = value;
      }
    }

    const { data, error } = await createMachine(payload as Partial<Machine>);
    if (error) {
      setFormError(error.message);
      setSavingMachine(false);
      return;
    }

    setMachineForm({});
    setAddOpen(false);
    await loadMachines();
    if (data) {
      router.push(`/maschinen/${data.id}`);
    }
    setSavingMachine(false);
  }

  return (
    <AppPageShell
      activeHref="/maschinen"
      top={
        <header className="pageHeader compactPageHeader">
          <button
            type="button"
            className="pillButton primary"
            onClick={() => setAddOpen(true)}
            disabled={!canWriteMachines}
            title={!canWriteMachines ? "Keine Berechtigung: machines.write erforderlich." : undefined}
          >
            Maschine hinzufügen
          </button>
        </header>
      }
    >
        {loading ? (
          <div className="welcomeCard">
            <h1>Laden…</h1>
          </div>
        ) : loadError ? (
          <div className="welcomeCard">
            <h1>Fehler</h1>
            <p>{loadError}</p>
            <p>
              Fuehren Sie <code>supabase/maschines-setup.sql</code> im Supabase SQL Editor aus.
            </p>
          </div>
        ) : (
          <>
            <div className="searchToolbar card maschinenFiltersBar">
              <label className="arbeitsauftragFilterField">
                <span>Gerätenummer</span>
                <input
                  type="search"
                  value={filters.geraetenummer}
                  onChange={(event) => updateFilter("geraetenummer", event.target.value)}
                  placeholder="z. B. GE 356267"
                  autoComplete="off"
                />
              </label>
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
              <label className="arbeitsauftragFilterField">
                <span>Bezeichnung</span>
                <input
                  type="search"
                  value={filters.bezeichnung}
                  onChange={(event) => updateFilter("bezeichnung", event.target.value)}
                  placeholder="Bezeichnung"
                />
              </label>
              <button
                type="button"
                className="pillButton outline arbeitsauftragFilterReset"
                onClick={() => setFilters(EMPTY_MACHINE_FILTERS)}
              >
                Zurücksetzen
              </button>
              <button
                type="button"
                className="pillButton primary"
                onClick={() => setQrOpen(true)}
              >
                QR-Code scannen
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
        onClose={() => setQrOpen(false)}
        onScan={handleScan}
      />

      {addOpen ? (
        <div className="qrModalBackdrop">
          <form className="card machineFormModal" onSubmit={handleCreateMachine}>
            <div className="cardHeader">
              <div>
                <p className="cardTitle">Maschine hinzufügen</p>
                <p className="subtitle">Alle Maschinendaten erfassen.</p>
              </div>
              <button type="button" className="pillButton outline" onClick={() => setAddOpen(false)}>
                Schließen
              </button>
            </div>

            {formError ? <p className="protocolNotice">{formError}</p> : null}

            <div className="protocolGrid machineFormGrid">
              {MACHINE_FORM_FIELDS.map((field) => (
                <label key={String(field.key)} className="protocolField">
                  <span>{field.label}</span>
                  <input
                    type={field.type === "date" ? "text" : field.type ?? "text"}
                    value={machineForm[String(field.key)] ?? ""}
                    onChange={(event) =>
                      setMachineForm((current) => ({
                        ...current,
                        [String(field.key)]: event.target.value,
                      }))
                    }
                    placeholder={field.type === "date" ? "TT.MM.JJJJ" : undefined}
                  />
                </label>
              ))}
            </div>

            <div className="actionButtons">
              <button type="button" className="pillButton outline" onClick={() => setAddOpen(false)}>
                Abbrechen
              </button>
              <button type="submit" className="pillButton primary" disabled={savingMachine}>
                {savingMachine ? "Speichern..." : "Maschine speichern"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
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
