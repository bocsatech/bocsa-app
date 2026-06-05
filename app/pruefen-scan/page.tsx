"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import AppPageShell from "../components/AppPageShell";
import MachineStatusIndicators from "../components/MachineStatusIndicators";
import QrScannerModal from "../components/QrScannerModal";
import {
  fetchMachines,
  formatValue,
  resolveMachineFromScan,
  type MachineRecord,
} from "../../lib/machines";

type Step = "ask" | "result";

function meldungLabel(machine: MachineRecord) {
  const meldungen = machine.machine_tab_data?.meldungen;
  const count = Array.isArray(meldungen) ? meldungen.length : 0;
  return count > 0 ? "Meldung vorhanden" : "Keine Meldung";
}

export default function PruefenScanPage() {
  const [step, setStep] = useState<Step>("ask");
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [machine, setMachine] = useState<MachineRecord | null>(null);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await fetchMachines();
      if (error) {
        setLoadError(error.message);
        setMachines([]);
      } else {
        setMachines((data ?? []) as MachineRecord[]);
      }
      setLoading(false);
    }
    load();
  }, []);

  function handleScan(value: string) {
    setScanHint(null);
    const match = resolveMachineFromScan(machines, value);
    if (!match) {
      setScanHint(`Kein Gerät zu diesem Code: „${value}”`);
      return;
    }
    setMachine(match as MachineRecord);
    setStep("result");
  }

  function startPruefen() {
    setStep("result");
    setMachine(null);
    setScanHint(null);
    setQrOpen(true);
  }

  const meldung = machine ? meldungLabel(machine) : "";
  const meldungDanger = meldung.toLowerCase().includes("vorhanden");

  return (
    <AppPageShell activeHref="/" subtitle="Betrieb" backFallbackHref="/">
      <div className="scanFlowPage">
        {step === "ask" ? (
          <article className="card scanFlowCard">
            <h1>Prüfen</h1>
            <p className="scanFlowLead">Möchten Sie Geräte prüfen?</p>
            <p className="scanFlowHint">
              QR-Code scannen — Status, Intern §11, Service und Meldung wie in der Maschinenliste.
            </p>
            {loading ? <p className="scanFlowHint">Geräteliste wird geladen…</p> : null}
            {loadError ? <p className="scanFlowError">{loadError}</p> : null}
            <div className="scanFlowActions">
              <button
                type="button"
                className="pillButton primary"
                onClick={startPruefen}
                disabled={loading || Boolean(loadError)}
              >
                Ja, Gerät scannen
              </button>
              <Link href="/" className="pillButton outline">
                Nein, zurück
              </Link>
            </div>
          </article>
        ) : (
          <article className="card scanFlowCard">
            <div className="scanFlowHeader">
              <div>
                <h1>Prüfen — Gerätestatus</h1>
                <p className="scanFlowHint">QR scannen oder neues Gerät erfassen</p>
              </div>
              <Link href="/" className="pillButton outline">
                Beenden
              </Link>
            </div>

            {scanHint ? <p className="scanFlowError">{scanHint}</p> : null}

            {machine ? (
              <div className="pruefenScanResult">
                <div className="pruefenScanHero">
                  {machine.image ? (
                    <img src={machine.image} alt="" className="pruefenScanImage" />
                  ) : (
                    <span className="pruefenScanImagePlaceholder">Bild</span>
                  )}
                  <div className="pruefenScanMain">
                    <p className="pruefenScanNr">{formatValue(machine.geraetenummer)}</p>
                    <p className="pruefenScanTitle">{formatValue(machine.bezeichnung)}</p>
                    <p className="pruefenScanMeta">
                      {formatValue(machine.subgroup)} · {formatValue(machine.depot)}
                    </p>
                  </div>
                </div>

                <MachineStatusIndicators machine={machine} className="pruefenScanStatus" />

                <div className="fieldRow pruefenScanMeldungRow">
                  <span>Meldung</span>
                  <strong className={meldungDanger ? "meldungStatusValue danger" : "meldungStatusValue ok"}>
                    {meldung}
                  </strong>
                </div>

                <Link
                  href={`/maschinen/${machine.id}`}
                  className="pillButton outline"
                >
                  Gerät öffnen
                </Link>
              </div>
            ) : (
              <p className="scanFlowHint">Noch kein Gerät — QR scannen.</p>
            )}

            <div className="scanFlowActions">
              <button type="button" className="pillButton primary" onClick={() => setQrOpen(true)}>
                Weiteres Gerät scannen
              </button>
            </div>
          </article>
        )}
      </div>

      <QrScannerModal open={qrOpen} onClose={() => setQrOpen(false)} onScan={handleScan} />
    </AppPageShell>
  );
}
