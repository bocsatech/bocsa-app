"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
  /** Mobil: volle weiße Fläche, nur Kamera */
  plain?: boolean;
};

export default function QrScannerModal({ open, onClose, onScan, plain = false }: Props) {
  const readerId = useId().replace(/:/g, "");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;

    let scanner: Html5Qrcode | null = null;
    let active = true;
    let started = false;

    async function startScanner() {
      setError(null);
      scanner = new Html5Qrcode(readerId);

      try {
        await scanner.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          (decoded) => {
            if (!active) return;
            active = false;
            onScan(decoded);
            onClose();
          },
          () => {}
        );
        started = true;
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Kamera konnte nicht gestartet werden. Bitte Zugriff erlauben."
        );
      }
    }

    startScanner();

    return () => {
      active = false;
      if (scanner) {
        if (started) {
          scanner.stop().catch(() => {});
        }
        try {
          scanner.clear();
        } catch {
          /* scanner already cleared */
        }
      }
    };
  }, [open, onClose, onScan, readerId]);

  if (!open) return null;

  if (plain) {
    const node = (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="QR-Code scannen"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 200,
          background: "#ffffff",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div id={readerId} style={{ flex: 1, minHeight: 0, width: "100%" }} />
        {error ? (
          <p style={{ color: "#dc2626", padding: "12px 16px", margin: 0, textAlign: "center" }}>
            {error}
          </p>
        ) : null}
      </div>
    );
    return typeof document !== "undefined" ? createPortal(node, document.body) : node;
  }

  return (
    <div
      className="qrModalBackdrop"
      role="dialog"
      aria-modal="true"
      aria-label="QR-Code scannen"
    >
      <article className="card qrModalCard">
        <div className="cardHeader">
          <p className="cardTitle">QR-Code scannen</p>
          <button type="button" className="pillButton outline" onClick={onClose}>
            Schließen
          </button>
        </div>
        <div id={readerId} className="qrReader" />
        {error ? <p style={{ color: "#dc2626" }}>{error}</p> : null}
      </article>
    </div>
  );
}
