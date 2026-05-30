"use client";

import { useState } from "react";
import { GERAETTYP_OPTIONS } from "../../lib/machines";
import {
  type GeraetenummerCodesConfig,
  addGeraetenummerCodeEntry,
  normalizeGeraetenummerCode,
} from "../../lib/geraetenummer";

type Props = {
  codes: GeraetenummerCodesConfig;
  onCodesChange: (codes: GeraetenummerCodesConfig) => void;
};

type Category = "marken" | "klassen" | "arten";

const CATEGORY_LABELS: Record<Category, string> = {
  marken: "Marken",
  klassen: "Klassen",
  arten: "Gerätetypen",
};

export default function GeraetenummerCodesManager({ codes, onCodesChange }: Props) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<Category>("marken");
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [geraettyp, setGeraettyp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const { data, error: saveError } = await addGeraetenummerCodeEntry({
      category,
      code: normalizeGeraetenummerCode(code),
      label: label.trim() || undefined,
      geraettyp: category === "klassen" ? geraettyp || label.trim() : undefined,
    });

    setSaving(false);

    if (saveError) {
      setError(saveError.message);
      return;
    }

    if (data) {
      onCodesChange(data);
      setCode("");
      setLabel("");
      setGeraettyp("");
    }
  }

  return (
    <div className="geraetenummerCodesManager">
      <button
        type="button"
        className="pillButton outline geraetenummerCodesToggle"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        {open ? "Kódok verwalten schließen" : "Kódok verwalten"}
      </button>

      {open ? (
        <div className="geraetenummerCodesPanel">
          <p className="geraetenummerCodesHint">
            Neue Codes für die Gerätenummer. Bestehende Codes können nicht geändert werden.
          </p>

          <form className="geraetenummerCodesForm" onSubmit={handleAdd}>
            <label>
              <span>Kategorie</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as Category)}
              >
                {(Object.keys(CATEGORY_LABELS) as Category[]).map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Code</span>
              <input
                type="text"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                placeholder="z. B. CAT"
                required
              />
            </label>
            <label>
              <span>Bezeichnung</span>
              <input
                type="text"
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                placeholder="optional"
              />
            </label>
            {category === "klassen" ? (
              <label>
                <span>Gerättyp (Stammdaten)</span>
                <select
                  value={geraettyp}
                  onChange={(event) => setGeraettyp(event.target.value)}
                  required
                >
                  <option value="">—</option>
                  {GERAETTYP_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}
            <button type="submit" className="pillButton primary" disabled={saving}>
              {saving ? "Speichern…" : "Code hinzufügen"}
            </button>
          </form>

          {error ? <p className="geraetenummerCodesError">{error}</p> : null}

          <div className="geraetenummerCodesLists">
            {(Object.keys(CATEGORY_LABELS) as Category[]).map((key) => (
              <div key={key} className="geraetenummerCodesList">
                <h4>{CATEGORY_LABELS[key]}</h4>
                <ul>
                  {(key === "marken"
                    ? codes.marken
                    : key === "klassen"
                      ? codes.klassen
                      : codes.arten
                  ).map((entry) => (
                    <li key={entry.code}>
                      <code>{entry.code}</code>
                      {entry.label ? ` — ${entry.label}` : ""}
                      {"geraettyp" in entry && entry.geraettyp
                        ? ` (${entry.geraettyp})`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
