"use client";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useId, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onScan: (value: string) => void;
};

export default function QrScannerModal({ open, onClose, onScan }: Props) {
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
