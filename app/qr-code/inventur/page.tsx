"use client";

import { useEffect, useRef, useState } from "react";
import QrScannerModal from "../../components/QrScannerModal";
import {
  fetchLagerTeile,
  formatLagerValue,
  normalizeHerstellernummer,
} from "../../../lib/lager";
import { createInventurSession } from "../../../lib/lager-inventur-session";
import { INVENTUR_NEU_PREFILL_KEY } from "../../../lib/lager-inventur-scan";
import type { LagerTeil } from "../../../lib/types/lager";

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

function parseQuantity(raw: string) {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(value) || value < 0) return null;
  return String(value);
}

export default function QrInventurScanPage() {
  const [teile, setTeile] = useState<LagerTeil[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [scannedTeil, setScannedTeil] = useState<LagerTeil | null>(null);
  const [quantity, setQuantity] = useState("");
  const [sessionList, setSessionList] = useState<Record<string, string>>({});
  const [scanError, setScanError] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [finishMessage, setFinishMessage] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const teileRef = useRef<LagerTeil[]>([]);

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
    if (loading || loadError || teile.length === 0 || scannedTeil) return;
    setScanOpen(true);
  }, [loadError, loading, scannedTeil, teile.length]);

  function handleQrScan(decoded: string) {
    const rows = teileRef.current;
    if (rows.length === 0) {
      setScanError("Lager nicht geladen.");
      setScanOpen(true);
      return;
    }

    const match = resolveTeilFromScan(rows, decoded);
    if (!match) {
      setScanError(`Unbekannter QR: ${extractScanValue(decoded) || decoded}`);
      setScanOpen(true);
      return;
    }

    setScanError(null);
    setScannedTeil(match);
    setQuantity(String(match.lagerstand ?? 0));
    setScanOpen(false);
  }

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
    setScanOpen(true);
  }

  async function handleBeenden() {
    let final = { ...sessionList };
    const merged = mergeCurrentIntoList(final);
    if (merged !== null) {
      final = merged;
    }

    const order = Object.keys(final);
    if (order.length === 0) {
      setFinishMessage("Keine gescannten Teile.");
      return;
    }

    setFinishing(true);
    setFinishMessage(null);
    const { error } = await createInventurSession({ order, counts: final });
    setFinishing(false);

    if (error) {
      setFinishMessage(error.message);
      return;
    }

    sessionStorage.setItem(INVENTUR_NEU_PREFILL_KEY, JSON.stringify(final));
    setSessionList({});
    setScannedTeil(null);
    setQuantity("");
    setFinishMessage(
      `Scan übertragen (${order.length} Teile). Am PC: Lager → Inventur lädt automatisch.`
    );
  }

  const canScan = !loading && !loadError && teile.length > 0 && !scannedTeil;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100dvh",
        background: "#ffffff",
      }}
    >
      <button
        type="button"
        className="qrReader"
        style={{
          flex: "1 1 50%",
          minHeight: 280,
          width: "100%",
          background: "#111827",
          border: "none",
          padding: 0,
          cursor: canScan ? "pointer" : "default",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
        disabled={!canScan}
        onClick={() => {
          if (canScan) setScanOpen(true);
        }}
      >
        {canScan && !scanOpen ? (
          <span className="scanHint" style={{ color: "#f9fafb" }}>
            QR scannen…
          </span>
        ) : null}
      </button>

      <QrScannerModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onScan={handleQrScan}
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
        {scanError ? <p style={{ color: "#dc2626" }}>{scanError}</p> : null}
        {finishMessage ? <p style={{ color: "#059669", margin: 0 }}>{finishMessage}</p> : null}

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
          disabled={finishing}
          onClick={() => void handleBeenden()}
        >
          {finishing ? "Übertragen…" : "Beenden"}
        </button>
      </section>
    </div>
  );
}
