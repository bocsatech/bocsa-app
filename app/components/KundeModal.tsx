"use client";

import { useEffect, useState } from "react";
import { KUNDEN_FORM_FIELDS, saveKunde } from "../../lib/pkw";
import type { Kunde } from "../../lib/types/pkw";

type Props = {
  kunde: Kunde | null;
  onClose: () => void;
  onSaved: (kunde: Kunde) => void;
};

export default function KundeModal({ kunde, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [portalPin, setPortalPin] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const { key } of KUNDEN_FORM_FIELDS) {
      const v = kunde?.[key];
      initial[key] = v != null ? String(v) : "";
    }
    if (!initial.land) initial.land = "AT";
    setForm(initial);
    setPortalPin("");
  }, [kunde]);

  function update(key: string, value: string) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload: Record<string, unknown> = { ...form, aktiv: true };
    if (portalPin.trim()) payload.portal_pin = portalPin.trim();

    const { data, error: err } = await saveKunde(payload, kunde?.id);
    setSaving(false);
    if (err || !data) {
      setError(err ?? "Speichern fehlgeschlagen.");
      return;
    }
    onSaved(data);
  }

  return (
    <div className="qrModalBackdrop" onClick={onClose}>
      <div className="qrModal card pkwModal" onClick={(e) => e.stopPropagation()}>
        <header className="cardHeader">
          <h2 className="cardTitle">{kunde ? "Kunde bearbeiten" : "Neuer Kunde"}</h2>
        </header>
        <form className="pkwForm" onSubmit={handleSubmit}>
          <div className="pkwFormGrid">
            {KUNDEN_FORM_FIELDS.map(({ key, label, required }) => (
              <label key={key} className="pkwField">
                <span>
                  {label}
                  {required ? " *" : ""}
                </span>
                <input
                  value={form[key] ?? ""}
                  onChange={(e) => update(key, e.target.value)}
                  required={required && !form.firma?.trim()}
                />
              </label>
            ))}
            <label className="pkwField pkwFieldFull">
              <span>Portal-PIN (Kennzeichen-Login für Kunden)</span>
              <input
                type="password"
                autoComplete="new-password"
                placeholder={kunde?.portal_pin_set ? "Leer = unverändert" : "mind. 4 Zeichen"}
                value={portalPin}
                onChange={(e) => setPortalPin(e.target.value)}
              />
            </label>
          </div>
          {error ? <p className="errorText">{error}</p> : null}
          <div className="pkwModalActions">
            <button type="button" className="secondaryBtn" onClick={onClose}>
              Abbrechen
            </button>
            <button type="submit" className="primaryBtn" disabled={saving}>
              {saving ? "Speichern…" : "Speichern"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
