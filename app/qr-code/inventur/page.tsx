"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  fetchLagerTeile,
  formatLagerValue,
  normalizeHerstellernummer,
} from "../../../lib/lager";
import type { LagerTeil } from "../../../lib/types/lager";

const INVENTUR_NEU_PREFILL_KEY = "bocsaInventurNeuPrefill";

function extractScanValue(raw: string) {
  const text = String(raw ?? "").trim();
  if (!text) return "";

  try {
    const url = new URL(text);
    const teilId = url.searchParams.get("teil");
    if (teilId) return teilId.trim();
  } catch {
    // plain text
  }

  return text;
}

function resolveTeilFromScan(teile: LagerTeil[], decoded: string) {
  const scan = extractScanValue(decoded);
  if (!scan) return null;

  const byId = teile.find((teil) => teil.id === scan);
  if (byId) return byId;

  const lower = scan.toLowerCase();
  const byNumbers = teile.find(
    (teil) =>
      String(teil.herstellernummer ?? "").toLowerCase() === lower ||
      String(teil.artikelnummer ?? "").toLowerCase() === lower
  );
  if (byNumbers) return byNumbers;

  const compact = normalizeHerstellernummer(scan);
  if (!compact) return null;

  return (
    teile.find(
      (teil) => normalizeHerstellernummer(teil.herstellernummer) === compact
    ) ?? null
  );
}

const SCANNER_CONFIG = {
  fps: 10,
  qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
    const edge = Math.min(viewfinderWidth, viewfinderHeight);
    const size = Math.min(260, Math.floor(edge * 0.85));
    return { width: size, height: size };
  },
  aspectRatio: 1.777778,
  disableFlip: false,
} as const;

function parseQuantity(raw: string) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;
  return String(value);
}

export default function QrInventurScanPage() {
  const router = useRouter();
  const readerId = useId().replace(/:/g, "");
  const [teile, setTeile] = useState<LagerTeil[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scannedTeil, setScannedTeil] = useState<LagerTeil | null>(null);
  const [quantity, setQuantity] = useState("");
  const [sessionList, setSessionList] = useState<Record<string, string>>({});
  const [scanError, setScanError] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannedTeilRef = useRef<LagerTeil | null>(null);
  const teileRef = useRef<LagerTeil[]>([]);

  useEffect(() => {
    scannedTeilRef.current = scannedTeil;
  }, [scannedTeil]);

  useEffect(() => {
    teileRef.current = teile;
  }, [teile]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setLoadError(null);
      const { data, error } = await fetchLagerTeile();
      if (error) {
        setLoadError(error.message);
        setTeile([]);
      } else {
        setTeile(data ?? []);
      }
      setLoading(false);
    }

    void load();
  }, []);

  useEffect(() => {
    if (loading || loadError || teile.length === 0) return;

    let scanner: Html5Qrcode | null = null;
    let active = true;
    let started = false;

    function onDecoded(decoded: string) {
      if (!active || scannedTeilRef.current) return;

      const rows = teileRef.current;
      if (rows.length === 0) {
        setScanError("Lager nicht geladen.");
        return;
      }

      const match = resolveTeilFromScan(rows, decoded);
      if (!match) {
        setScanError(`Unbekannter QR: ${extractScanValue(decoded) || decoded}`);
        return;
      }

      setScanError(null);
      setScannedTeil(match);
      setQuantity(String(match.lagerstand ?? 0));
    }

    async function startScanner() {
      setCameraError(null);
      scanner = new Html5Qrcode(readerId);

      try {
        await scanner.start(
          {
            facingMode: "environment",
          },
          SCANNER_CONFIG,
          (decoded) => {
            if (!active) return;
            onDecoded(decoded);
          },
          () => {}
        );
        started = true;
      } catch (cause) {
        setCameraError(
          cause instanceof Error
            ? cause.message
            : "Kamera konnte nicht gestartet werden. Bitte Zugriff erlauben."
        );
      }
    }

    void startScanner();

    return () => {
      active = false;
      if (scanner) {
        if (started) {
          scanner.stop().catch(() => {});
        }
        try {
          scanner.clear();
        } catch {
          /* already cleared */
        }
      }
    };
  }, [loadError, loading, readerId, teile.length]);

  function mergeCurrentIntoList(base: Record<string, string>) {
    if (!scannedTeil) return base;
    const parsed = parseQuantity(quantity);
    if (parsed === null) return null;
    return { ...base, [scannedTeil.id]: parsed };
  }

  function handleWeiter() {
    const next = mergeCurrentIntoList(sessionList);
    if (next === null) return;
    setSessionList(next);
    setScannedTeil(null);
    setQuantity("");
    setScanError(null);
  }

  function handleBeenden() {
    let final = { ...sessionList };
    const merged = mergeCurrentIntoList(final);
    if (merged !== null) {
      final = merged;
    }
    sessionStorage.setItem(INVENTUR_NEU_PREFILL_KEY, JSON.stringify(final));
    router.push("/lager/inventur");
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "#ffffff",
      }}
    >
      <div
        id={readerId}
        className="qrReader"
        style={{
          flex: "1 1 50%",
          minHeight: 280,
          width: "100%",
          background: "#111827",
        }}
      />
      <section
        style={{
          flex: "1 1 50%",
          minHeight: 0,
          overflowY: "auto",
          padding: 16,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          borderTop: "1px solid #e5e7eb",
        }}
      >
        {loading ? <p className="scanHint">Lager wird geladen…</p> : null}
        {loadError ? <p style={{ color: "#dc2626" }}>{loadError}</p> : null}
        {cameraError ? <p style={{ color: "#dc2626" }}>{cameraError}</p> : null}
        {scanError ? <p style={{ color: "#dc2626" }}>{scanError}</p> : null}

        {scannedTeil ? (
          <>
            <p style={{ margin: 0, fontWeight: 700 }}>
              {formatLagerValue(scannedTeil.herstellernummer)}
            </p>
            <p style={{ margin: 0, color: "#6b7280" }}>
              {scannedTeil.bezeichnung?.trim() || "—"}
            </p>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Menge</span>
              <input
                type="number"
                min={0}
                step={1}
                inputMode="decimal"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                className="lagerInventurInput"
              />
            </label>
          </>
        ) : (
          <p className="scanHint" style={{ margin: 0 }}>
            QR scannen…
          </p>
        )}

        <button
          type="button"
          className="pillButton primary"
          style={{ width: "100%", justifyContent: "center" }}
          disabled={!scannedTeil || parseQuantity(quantity) === null}
          onClick={handleWeiter}
        >
          Weiter
        </button>
        <button
          type="button"
          className="pillButton outline"
          style={{ width: "100%", justifyContent: "center" }}
          onClick={handleBeenden}
        >
          Beenden
        </button>
      </section>
    </div>
  );
}
