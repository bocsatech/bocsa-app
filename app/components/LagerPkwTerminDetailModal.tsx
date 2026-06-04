"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import MaintenanceLagerParts from "./MaintenanceLagerParts";
import {
  BUCHUNG_SOURCE_LABELS,
  BUCHUNG_STATUS_LABELS,
  formatSlotLabel,
} from "../../lib/pkw";
import { getPkwErsatzteile, serializePkwErsatzteile } from "../../lib/pkw-ersatzteile";
import type { MaintenanceLagerLink } from "../../lib/types/maintenance";
import type { PkwBuchung, PkwFahrzeug } from "../../lib/types/pkw";

type Props = {
  open: boolean;
  buchung: PkwBuchung | null;
  fahrzeug: PkwFahrzeug | null;
  canEdit: boolean;
  onClose: () => void;
  onSaved: (fahrzeug: PkwFahrzeug) => void;
};

async function saveTerminErsatzteile(buchungId: string, ersatzteile: MaintenanceLagerLink[]) {
  const response = await fetch(`/api/lager/termine/${buchungId}/ersatzteile`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ ersatzteile: serializePkwErsatzteile(ersatzteile) }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return { error: result.error ?? "Speichern fehlgeschlagen." };
  }
  return { fahrzeug: result.fahrzeug as PkwFahrzeug, error: null };
}

export default function LagerPkwTerminDetailModal({
  open,
  buchung,
  fahrzeug,
  canEdit,
  onClose,
  onSaved,
}: Props) {
  const [ersatzteile, setErsatzteile] = useState<MaintenanceLagerLink[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetParts = useCallback(() => {
    if (fahrzeug) {
      setErsatzteile(getPkwErsatzteile(fahrzeug));
    } else {
      setErsatzteile([]);
    }
  }, [fahrzeug]);

  useEffect(() => {
    if (!open) return;
    resetParts();
    setError(null);
  }, [open, resetParts]);

  useEffect(() => {
    if (!open) return;

    document.body.classList.add("appModalOpen");

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("appModalOpen");
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const serviceLabels = useMemo(() => {
    if (!buchung?.servicearten?.length) return "—";
    return buchung.servicearten.join(", ");
  }, [buchung?.servicearten]);

  async function handleSave() {
    if (!buchung || !fahrzeug) return;
    setSaving(true);
    setError(null);
    const { fahrzeug: saved, error: err } = await saveTerminErsatzteile(buchung.id, ersatzteile);
    setSaving(false);
    if (err || !saved) {
      setError(err ?? "Speichern fehlgeschlagen.");
      return;
    }
    onSaved(saved);
    onClose();
  }

  if (!open || !buchung) return null;
  if (typeof document === "undefined") return null;

  const kennzeichen = fahrzeug?.kennzeichen ?? buchung.kennzeichen;
  const sourceLabel =
    buchung.source === "portal"
      ? BUCHUNG_SOURCE_LABELS.portal ?? "Portal"
      : BUCHUNG_SOURCE_LABELS.buero ?? "Büro";

  return createPortal(
    <div
      className="qrModalBackdrop machineAddModalBackdrop"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="machineAddModal lagerPkwTerminModal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="lager-pkw-termin-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="machineAddModalHeader">
          <div>
            <h2 id="lager-pkw-termin-title" className="machineAddModalTitle">
              Reservierung — {kennzeichen}
            </h2>
            <p className="subtitle machineAddModalSubtitle">
              {formatSlotLabel(buchung.slot_start)} · {sourceLabel}
            </p>
          </div>
          <button type="button" className="modalCloseBtn" onClick={onClose} aria-label="Schließen">
            ×
          </button>
        </header>

        <div className="machineAddModalBody lagerPkwTerminModalBody">
          <dl className="lagerPkwTerminMeta">
            <div>
              <dt>Status</dt>
              <dd>{BUCHUNG_STATUS_LABELS[buchung.status] ?? buchung.status}</dd>
            </div>
            <div>
              <dt>Leistungen</dt>
              <dd>{serviceLabels}</dd>
            </div>
            {buchung.problem_text?.trim() ? (
              <div className="lagerPkwTerminMetaFull">
                <dt>Kundenangabe</dt>
                <dd>{buchung.problem_text.trim()}</dd>
              </div>
            ) : null}
            {buchung.internal_notes?.trim() ? (
              <div className="lagerPkwTerminMetaFull">
                <dt>Interne Notiz</dt>
                <dd>{buchung.internal_notes.trim()}</dd>
              </div>
            ) : null}
          </dl>

          {fahrzeug ? (
            <fieldset className="pkwFieldset">
              <legend>Ersatzteilbedarf</legend>
              <p className="scanHint" style={{ margin: "0 0 10px" }}>
                Teile für <strong>{kennzeichen}</strong> — erscheinen in Lager-Meldungen bei
                Unterdeckung.
              </p>
              <MaintenanceLagerParts
                parts={ersatzteile}
                canEdit={canEdit}
                onChange={setErsatzteile}
                showGruppenActions={false}
              />
            </fieldset>
          ) : (
            <p className="protocolNotice" role="alert">
              Kein Fahrzeug in der PKW-Liste zu diesem Kennzeichen. Bitte zuerst unter PKW →
              Fahrzeuge anlegen, dann Ersatzteile hinzufügen.
            </p>
          )}

          {error ? <p className="errorText">{error}</p> : null}
        </div>

        <div className="machineAddModalActions">
          <button type="button" className="pillButton outline" onClick={onClose}>
            Schließen
          </button>
          {fahrzeug && canEdit ? (
            <button
              type="button"
              className="pillButton primary"
              disabled={saving}
              onClick={() => void handleSave()}
            >
              {saving ? "Speichern…" : "Ersatzteile speichern"}
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body
  );
}
