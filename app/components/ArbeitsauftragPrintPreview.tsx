"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import ArbeitsauftragPrintDocument from "./ArbeitsauftragPrintDocument";
import type { StammdatenField } from "../../lib/machines";
import type { WorkOrder } from "../../lib/work-orders";
import type { Machine } from "../../lib/types/machine";

type Props = {
  open: boolean;
  onClose: () => void;
  machine: Machine;
  order: WorkOrder;
  stammdatenFields: StammdatenField[];
  username?: string;
};

export default function ArbeitsauftragPrintPreview({
  open,
  onClose,
  machine,
  order,
  stammdatenFields,
  username,
}: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.classList.add("arbeitsauftrag-print-preview");
    return () => {
      document.body.classList.remove("arbeitsauftrag-print-preview");
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="arbeitsauftragPrintPreviewOverlay noPrint" role="dialog" aria-modal="true">
      <div className="arbeitsauftragPrintPreviewToolbar">
        <div className="arbeitsauftragPrintPreviewIntro">
          <h2>Druckvorschau</h2>
          <p>A4 — gleiches Layout wie beim Drucken</p>
        </div>
        <div className="arbeitsauftragPrintPreviewActions">
          <button type="button" className="pillButton outline" onClick={onClose}>
            Schließen
          </button>
          <button type="button" className="pillButton primary" onClick={() => window.print()}>
            Drucken
          </button>
        </div>
      </div>
      <div className="arbeitsauftragPrintPreviewPageEdge arbeitsauftragPrintPreviewPage" aria-hidden />
      <div className="arbeitsauftragPrintPreviewViewport">
        <div className="protocolPage">
          <ArbeitsauftragPrintDocument
            machine={machine}
            order={order}
            stammdatenFields={stammdatenFields}
            username={username}
          />
        </div>
      </div>
    </div>,
    document.body
  );
}
