"use client";

import { useEffect, useState } from "react";
import {
  BESTELLSTATUS_OPTIONS,
  LAGER_FORM_FIELDS,
  LAGER_LOCALHOST_FIELDS,
  createLagerTeil,
  updateLagerTeil,
} from "../../lib/lager";
import { formatGermanDate } from "../../lib/dates";
import GermanDateField from "./GermanDateField";
import LagerTeilBild from "./LagerTeilBild";
import type { LagerTeil } from "../../lib/types/lager";

type Props = {
  open: boolean;
  teil: LagerTeil | null;
  canWrite: boolean;
  readOnly?: boolean;
  showLocalhostFields?: boolean;
  onClose: () => void;
  onSaved: (teil: LagerTeil) => void;
};

type LagerFormState = Record<string, string>;

function emptyForm(): LagerFormState {
  return {
    artikelnummer: "",
    herstellernummer: "",
    bezeichnung: "",
    produktgruppe: "",
    lieferant: "",
    lagerort: "",
    lagerplatz: "",
    lagerstand: "0",
    listenpreis_netto: "",
    listenpreis_brutto: "",
    verkaufspreis: "",
    bestellstatus: "",
    wareneingangsdatum: "",
    herstellungsdatum: "",
    verfallsdatum: "",
    bestellender_benutzer: "",
    bestellender_kunde: "",
  };
}

function teilToForm(teil: LagerTeil): LagerFormState {
  return {
    artikelnummer: teil.artikelnummer ?? "",
    herstellernummer: teil.herstellernummer ?? "",
    bezeichnung: teil.bezeichnung ?? "",
    produktgruppe: teil.produktgruppe ?? "",
    lieferant: teil.lieferant ?? "",
    lagerort: teil.lagerort ?? "",
    lagerplatz: teil.lagerplatz ?? "",
    lagerstand: String(teil.lagerstand ?? 0),
    listenpreis_netto: teil.listenpreis_netto != null ? String(teil.listenpreis_netto) : "",
    listenpreis_brutto: teil.listenpreis_brutto != null ? String(teil.listenpreis_brutto) : "",
    verkaufspreis: teil.verkaufspreis != null ? String(teil.verkaufspreis) : "",
    bestellstatus: teil.bestellstatus ?? "",
    wareneingangsdatum: formatGermanDate(teil.wareneingangsdatum),
    herstellungsdatum: formatGermanDate(teil.herstellungsdatum),
    verfallsdatum: formatGermanDate(teil.verfallsdatum),
    bestellender_benutzer: teil.bestellender_benutzer ?? "",
    bestellender_kunde: teil.bestellender_kunde ?? "",
  };
}

export default function LagerTeilModal({
  open,
  teil,
  canWrite,
  readOnly = false,
  showLocalhostFields = false,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<LagerFormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedTeil, setSavedTeil] = useState<LagerTeil | null>(null);

  const activeTeil = teil ?? savedTeil;
  const editable = canWrite && !readOnly;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSavedTeil(null);
    if (teil) {
      setForm(teilToForm(teil));
    } else {
      setForm(emptyForm());
    }
  }, [open, teil]);

  if (!open) return null;

  function handleTeilUpdated(updated: LagerTeil) {
    setSavedTeil(updated);
    onSaved(updated);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable) return;

    setSaving(true);
    setError(null);

    const payload: Record<string, string | number | null> = {};
    for (const field of LAGER_FORM_FIELDS) {
      const raw = form[field.key]?.trim() ?? "";
      if (field.type === "number") {
        payload[field.key] = raw === "" ? (field.key === "lagerstand" ? 0 : null) : Number(raw);
      } else {
        payload[field.key] = raw || null;
      }
    }

    if (showLocalhostFields) {
      for (const field of LAGER_LOCALHOST_FIELDS) {
        const raw = form[field.key]?.trim() ?? "";
        payload[field.key] = raw || null;
      }
    }

    const result = activeTeil
      ? await updateLagerTeil(activeTeil.id, payload)
      : await createLagerTeil(payload);

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
      return;
    }

    if (result.data) {
      setSavedTeil(result.data);
      onSaved(result.data);
    }
    setSaving(false);
  }

  return (
    <div className="qrModalBackdrop">
      <form className="card lagerModal" onSubmit={handleSubmit}>
        <div className="cardHeader">
          <div>
            <p className="cardTitle">
              {activeTeil
                ? readOnly
                  ? "Ersatzteil anzeigen"
                  : "Ersatzteil bearbeiten"
                : "Ersatzteil anlegen"}
            </p>
            <p className="subtitle">Lager / Ersatzteile</p>
          </div>
          <button type="button" className="pillButton outline" onClick={onClose}>
            Schließen
          </button>
        </div>

        <div className="lagerModalBildRow">
          <span className="lagerModalBildLabel">Bild</span>
          {activeTeil ? (
            <LagerTeilBild teil={activeTeil} canWrite={editable} onUpdated={handleTeilUpdated} />
          ) : (
            <div className="lagerBildCell lagerBildCellPending">
              <span className="lagerThumbPlaceholder">+</span>
            </div>
          )}
          {!activeTeil ? (
            <p className="lagerBildHint">Bild nach dem Speichern hochladbar.</p>
          ) : null}
        </div>

        <div className="protocolGrid lagerFormGrid">
          {LAGER_FORM_FIELDS.map((field) => (
            <label key={field.key} className="protocolField">
              <span>{field.label}</span>
              {field.key === "bestellstatus" ? (
                <select
                  value={form.bestellstatus}
                  disabled={!editable}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, bestellstatus: event.target.value }))
                  }
                >
                  {BESTELLSTATUS_OPTIONS.map((option) => (
                    <option key={option || "empty"} value={option}>
                      {option || "—"}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type ?? "text"}
                  required={field.required}
                  value={form[field.key]}
                  disabled={!editable}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, [field.key]: event.target.value }))
                  }
                />
              )}
            </label>
          ))}
        </div>

        {showLocalhostFields ? (
          <div className="protocolGrid lagerFormGrid lagerLocalhostFieldsGrid">
            {LAGER_LOCALHOST_FIELDS.map((field) => (
              <label key={field.key} className="protocolField">
                <span>{field.label}</span>
                {field.type === "date" ? (
                  <GermanDateField
                    value={form[field.key]}
                    onChange={(value) =>
                      setForm((current) => ({ ...current, [field.key]: value }))
                    }
                    disabled={!editable}
                    readOnly={!editable}
                  />
                ) : (
                  <input
                    type="text"
                    value={form[field.key]}
                    disabled={!editable}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, [field.key]: event.target.value }))
                    }
                  />
                )}
              </label>
            ))}
          </div>
        ) : null}

        {error ? <p className="protocolNotice">{error}</p> : null}

        <div className="actionButtons">
          {readOnly ? (
            <button type="button" className="pillButton primary" onClick={onClose}>
              Schließen
            </button>
          ) : (
            <>
              <button type="button" className="pillButton outline" onClick={onClose}>
                Abbrechen
              </button>
              {editable ? (
                <button type="submit" className="pillButton primary" disabled={saving}>
                  {saving ? "Speichern..." : "Speichern"}
                </button>
              ) : null}
            </>
          )}
        </div>
      </form>
    </div>
  );
}
