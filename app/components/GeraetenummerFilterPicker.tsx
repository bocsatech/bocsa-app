"use client";

import {
  GERAETENUMMER_SEQ_DIGITS,
  type GeraetenummerCodesConfig,
  type GeraetenummerFilterPick,
} from "../../lib/geraetenummer";

type Props = {
  codes: GeraetenummerCodesConfig;
  value: GeraetenummerFilterPick;
  onChange: (value: GeraetenummerFilterPick) => void;
  disabled?: boolean;
};

export default function GeraetenummerFilterPicker({
  codes,
  value,
  onChange,
  disabled = false,
}: Props) {
  function update<K extends keyof GeraetenummerFilterPick>(
    key: K,
    next: GeraetenummerFilterPick[K]
  ) {
    onChange({ ...value, [key]: next });
  }

  return (
    <div className="geraetenummerFilterRow">
      <label className="geraetenummerFilterCell">
        <span>Marke</span>
        <select
          value={value.marke}
          disabled={disabled}
          onChange={(event) => update("marke", event.target.value)}
        >
          <option value="">—</option>
          {codes.marken.map((entry) => (
            <option key={entry.code} value={entry.code} title={entry.label}>
              {entry.code}
            </option>
          ))}
        </select>
      </label>
      <label className="geraetenummerFilterCell">
        <span>Klasse</span>
        <select
          value={value.klasse}
          disabled={disabled}
          onChange={(event) => update("klasse", event.target.value)}
        >
          <option value="">—</option>
          {codes.klassen.map((entry) => (
            <option key={entry.code} value={entry.code} title={entry.label}>
              {entry.code}
            </option>
          ))}
        </select>
      </label>
      <label className="geraetenummerFilterCell">
        <span>Gerätetyp</span>
        <select
          value={value.art}
          disabled={disabled}
          onChange={(event) => update("art", event.target.value)}
        >
          <option value="">—</option>
          {codes.arten.map((entry) => (
            <option key={entry.code} value={entry.code} title={entry.label}>
              {entry.code}
            </option>
          ))}
        </select>
      </label>
      <label className="geraetenummerFilterCell geraetenummerFilterCellSeq">
        <span>Lfd. Nr.</span>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          spellCheck={false}
          maxLength={GERAETENUMMER_SEQ_DIGITS}
          placeholder="—"
          value={value.lfdNr}
          disabled={disabled}
          onChange={(event) =>
            update("lfdNr", event.target.value.replace(/[^\d]/g, ""))
          }
        />
      </label>
    </div>
  );
}
