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

export default function QRCodePage() {
  const router = useRouter();
  const [machines, setMachines] = useState<MachineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scanHint, setScanHint] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [qrOpen, setQrOpen] = useState(true);

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
    setScanHint(`Nem található gép ehhez a kódhoz: "${value}"`);
    setSearchQuery(value);
  }

  return (
    <AppPageShell activeHref="/qr-code" subtitle="Üzemeltetés">
      <div className="welcomePage">
        <div className="welcomeCard">
          <h1>QR-Code scannen</h1>
          <p>Beolvasás után a rendszer automatikusan megnyitja a gép adatlapját.</p>
          <div className="detailTopActions" style={{ marginTop: 12 }}>
            <button type="button" className="pillButton primary" onClick={() => setQrOpen(true)}>
              Szkenner megnyitása
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
              Találatok: {matches.length} ({searchQuery})
            </p>
          ) : null}
        </div>
      </div>

      <QrScannerModal open={qrOpen} onClose={() => setQrOpen(false)} onScan={handleScan} />
    </AppPageShell>
  );
}
