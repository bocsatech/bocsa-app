"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import AppPageShell from "../components/AppPageShell";
import QrScannerModal from "../components/QrScannerModal";
import {
  appendInventurScanValue,
  clearInventurScanSession,
  createEmptyInventurScanSession,
  downloadInventurScanFile,
  inventurScanToCsv,
  readInventurScanSession,
  writeInventurScanSession,
  type InventurScanSession,
} from "../../lib/inventur-scan-session";

type Step = "ask" | "scan";

export default function InventurScanPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("ask");
  const [session, setSession] = useState<InventurScanSession | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSession(readInventurScanSession());
  }, []);

  function startInventur() {
    const next = createEmptyInventurScanSession();
    writeInventurScanSession(next);
    setSession(next);
    setStep("scan");
    setMessage(null);
  }

  function handleScan(value: string) {
    const next = appendInventurScanValue(value);
    setSession({ ...next, items: [...next.items] });
    const last = next.items[next.items.length - 1];
    setMessage(last ? `Erfasst: ${last.herstellernummer}` : "Leerer Scan.");
  }

  function handleReset() {
    clearInventurScanSession();
    setSession(null);
    setStep("ask");
    setMessage(null);
  }

  function handleDownloadJson() {
    if (!session?.items.length) {
      setMessage("Noch keine QR-Codes gescannt.");
      return;
    }
    downloadInventurScanFile(session);
  }

  function handleDownloadCsv() {
    if (!session?.items.length) {
      setMessage("Noch keine QR-Codes gescannt.");
      return;
    }
    const blob = new Blob([inventurScanToCsv(session)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `inventur-scan-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function sendToLagerInventur() {
    if (!session?.items.length) {
      setMessage("Bitte zuerst QR-Codes scannen.");
      return;
    }
    writeInventurScanSession(session);
    router.push("/lager/inventur?import=scan");
  }

  return (
    <AppPageShell activeHref="/" subtitle="Betrieb" backFallbackHref="/">
      <div className="scanFlowPage">
        {step === "ask" ? (
          <article className="card scanFlowCard">
            <h1>Inventur</h1>
            <p className="scanFlowLead">Möchten Sie eine Inventur starten?</p>
            <p className="scanFlowHint">
              QR-Codes der Lager-Teile scannen, als Datei speichern und in der Lager-Inventur
              weiterbearbeiten.
            </p>
            <div className="scanFlowActions">
              <button type="button" className="pillButton primary" onClick={startInventur}>
                Ja, Inventur starten
              </button>
              <Link href="/" className="pillButton outline">
                Nein, zurück
              </Link>
              <Link href="/lager/inventur" className="pillButton outline">
                Direkt zur Lager-Inventur
              </Link>
            </div>
          </article>
        ) : (
          <article className="card scanFlowCard">
            <div className="scanFlowHeader">
              <div>
                <h1>Inventur — QR scannen</h1>
                <p className="scanFlowHint">
                  {session?.items.length ?? 0} Teil(e) erfasst
                </p>
              </div>
              <button type="button" className="pillButton outline" onClick={handleReset}>
                Beenden
              </button>
            </div>

            {message ? <p className="scanFlowMessage">{message}</p> : null}

            <div className="scanFlowActions">
              <button type="button" className="pillButton primary" onClick={() => setQrOpen(true)}>
                QR scannen
              </button>
              <button type="button" className="pillButton outline" onClick={handleDownloadJson}>
                JSON speichern
              </button>
              <button type="button" className="pillButton outline" onClick={handleDownloadCsv}>
                CSV speichern
              </button>
              <button type="button" className="pillButton primary" onClick={sendToLagerInventur}>
                An Lager-Inventur senden
              </button>
            </div>

            {session?.items.length ? (
              <ul className="scanFlowList">
                {[...session.items].reverse().map((item) => (
                  <li key={`${item.herstellernummer}-${item.scannedAt}`}>
                    <strong>{item.herstellernummer}</strong>
                    <span>{new Date(item.scannedAt).toLocaleString("de-AT")}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="scanFlowHint">Noch keine Scans — „QR scannen“ tippen.</p>
            )}
          </article>
        )}
      </div>

      <QrScannerModal open={qrOpen} onClose={() => setQrOpen(false)} onScan={handleScan} />
    </AppPageShell>
  );
}
