"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  fetchPkwServicearten,
  fetchPkwSlots,
  formatSlotLabel,
  portalCreateBuchung,
  portalPkwLogin,
} from "../../../lib/pkw";
import type { PkwServiceArt, PkwSlotOption } from "../../../lib/types/pkw";

type Step = "login" | "details" | "slot" | "done";

function PkwBuchenForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [step, setStep] = useState<Step>("login");
  const [kennzeichen, setKennzeichen] = useState("");
  const [pin, setPin] = useState("");
  const [km, setKm] = useState("");
  const [problem, setProblem] = useState("");
  const [servicearten, setServicearten] = useState<string[]>([]);
  const [options, setOptions] = useState<PkwServiceArt[]>([]);
  const [day, setDay] = useState(() => new Date().toISOString().slice(0, 10));
  const [slots, setSlots] = useState<PkwSlotOption[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<PkwSlotOption | null>(null);
  const [fahrzeugLabel, setFahrzeugLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [confirmed, setConfirmed] = useState<{ slot: string; kennzeichen: string } | null>(null);

  useEffect(() => {
    fetchPkwServicearten().then(({ data }) => {
      if (data) setOptions(data);
    });
  }, []);

  useEffect(() => {
    if (step !== "slot") return;
    fetchPkwSlots(day).then(({ data, error: err }) => {
      if (err) setError(err);
      else setSlots(data ?? []);
    });
  }, [day, step]);

  const trySession = useCallback(async () => {
    const res = await fetch("/api/pkw/portal/session", { credentials: "include" });
    if (!res.ok) return false;
    const data = await res.json();
    if (data.authenticated && data.fahrzeug) {
      setKennzeichen(data.fahrzeug.kennzeichen ?? "");
      setFahrzeugLabel(
        [data.fahrzeug.marke, data.fahrzeug.modell].filter(Boolean).join(" ") ||
          data.fahrzeug.kennzeichen
      );
      if (data.fahrzeug.km_stand != null) setKm(String(data.fahrzeug.km_stand));
      setStep("details");
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    trySession();
  }, [trySession]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/pkw/portal/vehicle?token=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.kennzeichen) setKennzeichen(data.kennzeichen);
      })
      .catch(() => {});
  }, [token]);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const { data, error: err } = await portalPkwLogin(kennzeichen, pin);
    setLoading(false);
    if (err || !data) {
      setError(err ?? "Anmeldung fehlgeschlagen.");
      return;
    }
    setFahrzeugLabel(
      [data.fahrzeug.marke, data.fahrzeug.modell].filter(Boolean).join(" ") ||
        data.fahrzeug.kennzeichen
    );
    if (data.fahrzeug.km_stand != null) setKm(String(data.fahrzeug.km_stand));
    setStep("details");
  }

  function toggleService(key: string) {
    setServicearten((cur) =>
      cur.includes(key) ? cur.filter((k) => k !== key) : [...cur, key]
    );
  }

  async function handleBook() {
    if (!selectedSlot) return;
    setLoading(true);
    setError(null);
    const { data, error: err } = await portalCreateBuchung({
      kennzeichen,
      km_stand: km ? Number(km) : undefined,
      servicearten,
      problem_text: problem,
      slot_start: selectedSlot.start,
      slot_end: selectedSlot.end,
    });
    setLoading(false);
    if (err || !data) {
      setError(err ?? "Buchung fehlgeschlagen.");
      return;
    }
    setConfirmed({ slot: formatSlotLabel(data.slot_start), kennzeichen: data.kennzeichen });
    setStep("done");
  }

  return (
    <main className="pkwPortalPage">
      <header className="pkwPortalHeader">
        <div className="sidebarMark">B</div>
        <div>
          <h1>PKW Termin buchen</h1>
          <p className="subtitle">Bocsa PKW-Service</p>
        </div>
      </header>

      {token ? (
        <p className="subtitle pkwPortalHint">
          QR erkannt — Kennzeichen vorausgefüllt. Bitte Portal-PIN eingeben.
        </p>
      ) : null}

      {step === "login" ? (
        <form className="card pkwPortalCard" onSubmit={handleLogin}>
          <h2>Anmeldung</h2>
          <p className="subtitle">Kennzeichen und PIN (vom Werkstatt-Team erhalten)</p>
          <label className="pkwField">
            <span>Kennzeichen</span>
            <input
              value={kennzeichen}
              onChange={(e) => setKennzeichen(e.target.value.toUpperCase())}
              placeholder="W 1234 AB"
              required
            />
          </label>
          <label className="pkwField">
            <span>PIN</span>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
            />
          </label>
          {error ? <p className="errorText">{error}</p> : null}
          <button type="submit" className="primaryBtn pkwPortalSubmit" disabled={loading}>
            {loading ? "…" : "Weiter"}
          </button>
        </form>
      ) : null}

      {step === "details" ? (
        <div className="card pkwPortalCard">
          <h2>Fahrzeug & Wunsch</h2>
          <p className="subtitle">{fahrzeugLabel}</p>
          <label className="pkwField">
            <span>Km-Stand</span>
            <input type="number" value={km} onChange={(e) => setKm(e.target.value)} />
          </label>
          <fieldset className="pkwChecklist">
            <legend>Leistungen</legend>
            {options.map((opt) => (
              <label key={opt.key} className="pkwCheckRow">
                <input
                  type="checkbox"
                  checked={servicearten.includes(opt.key)}
                  onChange={() => toggleService(opt.key)}
                />
                {opt.label}
              </label>
            ))}
          </fieldset>
          <label className="pkwField">
            <span>Weitere Probleme / Hinweise</span>
            <textarea
              rows={3}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
            />
          </label>
          <button type="button" className="primaryBtn pkwPortalSubmit" onClick={() => setStep("slot")}>
            Termin wählen
          </button>
        </div>
      ) : null}

      {step === "slot" ? (
        <div className="card pkwPortalCard">
          <h2>Termin</h2>
          <label className="pkwField">
            <span>Datum</span>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
          <div className="pkwSlotGrid">
            {slots.map((slot) => (
              <button
                key={slot.start}
                type="button"
                className={`pkwSlotBtn${selectedSlot?.start === slot.start ? " selected" : ""}${
                  !slot.available ? " disabled" : ""
                }`}
                disabled={!slot.available}
                onClick={() => setSelectedSlot(slot)}
              >
                <strong>{slot.label}</strong>
                <span>{slot.available ? `${slot.freePlaetze} frei` : "Voll"}</span>
              </button>
            ))}
          </div>
          {error ? <p className="errorText">{error}</p> : null}
          <button
            type="button"
            className="primaryBtn pkwPortalSubmit"
            disabled={!selectedSlot || loading}
            onClick={handleBook}
          >
            {loading ? "Buchen…" : "Termin verbindlich anfragen"}
          </button>
        </div>
      ) : null}

      {step === "done" && confirmed ? (
        <div className="card pkwPortalCard pkwPortalDone">
          <h2>Danke!</h2>
          <p>
            Terminanfrage für <strong>{confirmed.kennzeichen}</strong>
          </p>
          <p>{confirmed.slot}</p>
          <p className="subtitle">Wir bestätigen den Termin in Kürze.</p>
        </div>
      ) : null}
    </main>
  );
}

export default function PkwBuchenPage() {
  return (
    <Suspense fallback={<main className="pkwPortalPage"><p>Laden…</p></main>}>
      <PkwBuchenForm />
    </Suspense>
  );
}
