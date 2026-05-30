"use client";

import { useEffect, useState } from "react";
import { FAHRZEUG_FORM_FIELDS, savePkwFahrzeug } from "../../lib/pkw";
import type { Kunde, PkwFahrzeug } from "../../lib/types/pkw";

type Props = {
  kunde: Kunde;
  fahrzeug: PkwFahrzeug | null;
  onClose: () => void;
  onSaved: (fahrzeug: PkwFahrzeug) => void;
};

export default function PkwFahrzeugModal({ kunde, fahrzeug, onClose, onSaved }: Props) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const { key } of FAHRZEUG_FORM_FIELDS) {
      const v = fahrzeug?.[key];
      initial[key] = v != null ? String(v) : "";
    }
    setForm(initial);
  }, [fahrzeug]);

  function update(key: string, value: string) {
    setForm((c) => ({ ...c, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      kunde_id: kunde.id,
      km_stand: form.km_stand ? Number(form.km_stand) : null,
      leistung_kw: form.leistung_kw ? Number(form.leistung_kw) : null,
    };

    const { data, error: err } = await savePkwFahrzeug(payload, fahrzeug?.id);
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
          <h2 className="cardTitle">
            {fahrzeug ? "Fahrzeug bearbeiten" : "Fahrzeug zuordnen"} — {kunde.nachname}
          </h2>
        </header>
        <form className="pkwForm" onSubmit={handleSubmit}>
          <div className="pkwFormGrid">
            {FAHRZEUG_FORM_FIELDS.map(({ key, label, required }) => (
              <label key={key} className="pkwField">
                <span>
                  {label}
                  {required ? " *" : ""}
                </span>
                <input
                  value={form[key] ?? ""}
                  onChange={(e) => update(key, e.target.value)}
                  required={Boolean(required)}
                />
              </label>
            ))}
          </div>
          {fahrzeug?.qr_token ? (
            <p className="subtitle pkwQrLink">
              QR / Portal:{" "}
              <a href={`/pkw/buchen?token=${fahrzeug.qr_token}`} target="_blank" rel="noreferrer">
                /pkw/buchen?token=…
              </a>
            </p>
          ) : null}
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
