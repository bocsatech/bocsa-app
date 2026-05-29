"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import MachineDetailPrintDocument from "./MachineDetailPrintDocument";
import type { StammdatenField } from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";
import "../machine-detail-print.css";

type Props = {
  open: boolean;
  onClose: () => void;
  machine: Machine;
  fields: StammdatenField[];
  bezeichnung?: string;
};

export default function MachineDetailPrintPreview({
  open,
  onClose,
  machine,
  fields,
  bezeichnung,
}: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("machine-detail-print-preview");
    return () => {
      document.body.classList.remove("machine-detail-print-preview");
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="machineDetailPrintPreviewOverlay noPrint"
      role="dialog"
      aria-modal="true"
      aria-label="Druckvorschau"
    >
      <div className="machineDetailPrintPreviewToolbar">
        <div className="machineDetailPrintPreviewIntro">
          <h2>Druckvorschau</h2>
          <p>A4 — gleiches Layout wie beim Drucken</p>
        </div>
        <div className="machineDetailPrintPreviewActions">
          <button type="button" className="pillButton outline" onClick={onClose}>
            Schließen
          </button>
          <button type="button" className="pillButton primary" onClick={() => window.print()}>
            Drucken
          </button>
        </div>
      </div>
      <div
        className="machineDetailPrintPreviewPageEdge machineDetailPrintPreviewPage"
        aria-hidden
      />
      <div className="machineDetailPrintPreviewViewport">
        <MachineDetailPrintDocument
          machine={machine}
          fields={fields}
          bezeichnung={bezeichnung}
        />
      </div>
    </div>,
    document.body
  );
}
