"use client";

import {
  type GeraetenummerCodesConfig,
  type GeraetenummerPick,
  composeGeraetenummer,
  formatGeraetenummerSequence,
} from "../../lib/geraetenummer";

type Props = {
  codes: GeraetenummerCodesConfig;
  pick: GeraetenummerPick;
  onPickChange: (pick: GeraetenummerPick) => void;
  previewSequence?: number | null;
  previewLoading?: boolean;
  disabled?: boolean;
};

export default function GeraetenummerPicker({
  codes,
  pick,
  onPickChange,
  previewSequence = null,
  previewLoading = false,
  disabled = false,
}: Props) {
  const preview =
    pick.marke && pick.klasse && pick.art && previewSequence
      ? composeGeraetenummer(pick, previewSequence)
      : "";

  return (
    <div className="geraetenummerPickerBlock">
      <p className="geraetenummerPickerLabel">Gerätenummer</p>
      <div className="geraetenummerPicker">
        <label className="geraetenummerPickerField">
          <span>Marke</span>
          <select
            value={pick.marke}
            disabled={disabled}
            onChange={(event) =>
              onPickChange({ ...pick, marke: event.target.value })
            }
          >
            <option value="">—</option>
            {codes.marken.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.code}
                {entry.label ? ` — ${entry.label}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="geraetenummerPickerField">
          <span>Klasse</span>
          <select
            value={pick.klasse}
            disabled={disabled}
            onChange={(event) =>
              onPickChange({ ...pick, klasse: event.target.value })
            }
          >
            <option value="">—</option>
            {codes.klassen.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.code}
                {entry.label ? ` — ${entry.label}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="geraetenummerPickerField">
          <span>Gerätetyp</span>
          <select
            value={pick.art}
            disabled={disabled}
            onChange={(event) => onPickChange({ ...pick, art: event.target.value })}
          >
            <option value="">—</option>
            {codes.arten.map((entry) => (
              <option key={entry.code} value={entry.code}>
                {entry.code}
                {entry.label ? ` — ${entry.label}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="geraetenummerPickerField geraetenummerPickerFieldSeq">
          <span>Lfd. Nr.</span>
          <input
            type="text"
            readOnly
            value={
              previewLoading
                ? "…"
                : previewSequence
                  ? formatGeraetenummerSequence(previewSequence)
                  : "—"
            }
            aria-label="Automatische laufende Nummer"
          />
        </label>
      </div>
      {preview ? (
        <p className="geraetenummerPreview">
          Vorschau: <strong>{preview}</strong>
        </p>
      ) : null}
    </div>
  );
}
