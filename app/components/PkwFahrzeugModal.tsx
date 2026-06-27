"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FAHRZEUG_FORM_FIELDS, formatKundeName, savePkwFahrzeug } from "../../lib/pkw";
import type { Kunde, PkwFahrzeug } from "../../lib/types/pkw";

type Props = {
  kunde: Kunde | null;
  kunden?: Kunde[];
  fahrzeug: PkwFahrzeug | null;
  onClose: () => void;
  onSaved: (fahrzeug: PkwFahrzeug) => void;
  onDeleted?: (fahrzeugId: string) => void;
};

export default function PkwFahrzeugModal({
  kunde,
  kunden = [],
  fahrzeug,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<Record<string, string>>({});
  const [selectedKundeId, setSelectedKundeId] = useState(kunde?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedKunde = useMemo(() => {
    if (kunde) return kunde;
    return kunden.find((entry) => entry.id === selectedKundeId) ?? null;
  }, [kunde, kunden, selectedKundeId]);

  const needsKundePicker = !kunde && !fahrzeug;

  useEffect(() => {
    setSelectedKundeId(kunde?.id ?? "");
  }, [kunde]);

  useEffect(() => {
    const initial: Record<string, string> = {};
    for (const { key } of FAHRZEUG_FORM_FIELDS) {
      const v = fahrzeug?.[key];
      initial[key] = v != null ? String(v) : "";
    }
    setForm(initial);
  }, [fahrzeug]);

  function update(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedKunde) {
      setError("Bitte einen Kunden wählen.");
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      kunde_id: selectedKunde.id,
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

  const title = fahrzeug
    ? `Fahrzeug bearbeiten — ${selectedKunde?.nachname ?? "Fahrzeug"}`
    : selectedKunde
      ? `Fahrzeug zuordnen — ${selectedKunde.nachname}`
      : "Fahrzeug hinzufügen";

  return (
    <div className="qrModalBackdrop" onClick={onClose}>
      <div className="qrModal card pkwModal" onClick={(event) => event.stopPropagation()}>
        <header className="cardHeader">
          <h2 className="cardTitle">{title}</h2>
        </header>
        {needsKundePicker && kunden.length === 0 ? (
          <div className="pkwForm">
            <p className="subtitle">
              Noch kein Kunde vorhanden. Bitte zuerst unter{" "}
              <Link href="/kunden" onClick={onClose}>
                Kunden
              </Link>{" "}
              anlegen.
            </p>
            <div className="pkwModalActions">
              <button type="button" className="secondaryBtn" onClick={onClose}>
                Schließen
              </button>
            </div>
          </div>
        ) : (
          <form className="pkwForm" onSubmit={handleSubmit}>
            <div className="pkwFormGrid">
              {needsKundePicker ? (
                <label className="pkwField">
                  <span>Kunde *</span>
                  <select
                    value={selectedKundeId}
                    onChange={(event) => setSelectedKundeId(event.target.value)}
                    required
                  >
                    <option value="">Bitte wählen…</option>
                    {kunden.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {formatKundeName(entry)}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {FAHRZEUG_FORM_FIELDS.map(({ key, label, required, placeholder, inputMode, type }) => (
                <label key={key} className="pkwField">
                  <span>
                    {label}
                    {required ? " *" : ""}
                  </span>
                  <input
                    type={type ?? "text"}
                    inputMode={inputMode}
                    value={form[key] ?? ""}
                    onChange={(event) => update(key, event.target.value)}
                    placeholder={placeholder}
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
              <button type="submit" className="primaryBtn" disabled={saving || (needsKundePicker && !selectedKundeId)}>
                {saving ? "Speichern…" : "Speichern"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
