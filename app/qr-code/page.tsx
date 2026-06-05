"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import AppPageShell from "../components/AppPageShell";
import QrScannerModal from "../components/QrScannerModal";
import {
  fetchMachines,
  filterMachines,
  resolveMachineFromScan,
  type MachineRecord,
} from "../../lib/machines";

const MOBILE_MQ = "(max-width: 760px)";

export default function QRCodePage() {
  const router = useRouter();
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [qrOpen, setQrOpen] = useState(true);
  const [mobileScanOpen, setMobileScanOpen] = useState(false);
  const [isMobile, setIsMobile] = useState<boolean | null>(null);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    async function loadMachines() {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await fetchMachines();
      if (error) {
        setLoadError(error.message);
        setMachines([]);
      } else {
        setMachines((data ?? []) as MachineRecord[]);
      }
      setLoading(false);
    }

    loadMachines();
  }, []);

  const matches = useMemo(
    () => filterMachines(machines, searchQuery),
    [machines, searchQuery]
  );

  function handleScan(value: string) {
    const match = resolveMachineFromScan(machines, value);
    if (match) {
      router.push(`/maschinen/${match.id}`);
      return;
    }
    setScanHint(`Keine Maschine zu diesem Code: „${value}"`);
    setSearchQuery(value);
  }

  if (isMobile !== false) {
    return (
      <>
        <main
          style={{
            minHeight: "100dvh",
            background: "#ffffff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "stretch",
            gap: 12,
            padding: 24,
            boxSizing: "border-box",
          }}
        >
          <button
            type="button"
            className="pillButton primary"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => setMobileScanOpen(true)}
          >
            QR code scan
          </button>
          <button
            type="button"
            className="pillButton outline"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => router.push("/lager/inventur")}
          >
            invertur
          </button>
          <button
            type="button"
            className="pillButton outline"
            style={{ width: "100%", justifyContent: "center" }}
            onClick={() => router.back()}
          >
            Beenden
          </button>
        </main>
        <QrScannerModal
          open={mobileScanOpen}
          onClose={() => setMobileScanOpen(false)}
          onScan={handleScan}
        />
      </>
    );
  }

  return (
    <AppPageShell activeHref="/qr-code" subtitle="Betrieb">
      <div className="welcomePage">
        <div className="welcomeCard">
          <h1>QR-Code scannen</h1>
          <p>Nach dem Scan öffnet das System automatisch die Maschinendaten.</p>
          <div className="detailTopActions" style={{ marginTop: 12 }}>
            <button type="button" className="pillButton primary" onClick={() => setQrOpen(true)}>
              Scanner öffnen
            </button>
            <Link className="pillButton outline" href="/maschinen">
              Maschinenliste
            </Link>
          </div>

          {loading ? <p className="scanHint">Maschinendaten werden geladen...</p> : null}
          {loadError ? <p className="scanHint">{loadError}</p> : null}
          {scanHint ? <p className="scanHint">{scanHint}</p> : null}

          {!loading && !loadError && searchQuery ? (
            <p className="scanHint">
              Treffer: {matches.length} ({searchQuery})
            </p>
          ) : null}
        </div>
      </div>

      <QrScannerModal open={qrOpen} onClose={() => setQrOpen(false)} onScan={handleScan} />
    </AppPageShell>
  );
}
