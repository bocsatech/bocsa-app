"use client";

import { dateYmdLocal } from "../../lib/pkw";
import type { PkwTerminZeitraumPreset } from "../../lib/lager-pkw-termine";
import GermanDateField from "./GermanDateField";
import GermanMonthField from "./GermanMonthField";

type Props = {
  preset: PkwTerminZeitraumPreset;
  onPresetChange: (preset: PkwTerminZeitraumPreset) => void;
  tag: string;
  onTagChange: (value: string) => void;
  monat: string;
  onMonatChange: (value: string) => void;
  jahr: string;
  onJahrChange: (value: string) => void;
  von: string;
  onVonChange: (value: string) => void;
  bis: string;
  onBisChange: (value: string) => void;
};

const PRESETS: Array<[PkwTerminZeitraumPreset, string]> = [
  ["tag", "Tag"],
  ["monat", "Monat"],
  ["jahr", "Jahr"],
  ["zeitraum", "Zeitraum"],
];

export default function LagerPkwTerminFilterBar({
  preset,
  onPresetChange,
  tag,
  onTagChange,
  monat,
  onMonatChange,
  jahr,
  onJahrChange,
  von,
  onVonChange,
  bis,
  onBisChange,
}: Props) {
  const currentYear = new Date().getFullYear();

  return (
    <div className="lagerBewegungenFilter card">
      <div className="lagerZeitraumTabs">
        {PRESETS.map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`pillButton outline${preset === key ? " active" : ""}`}
            onClick={() => onPresetChange(key)}
          >
            {label}
          </button>
        ))}
      </div>
      {preset === "tag" ? (
        <div className="lagerZeitraumFrei">
          <label className="arbeitsauftragFilterField">
            <span>Datum</span>
            <GermanDateField value={tag} onChange={onTagChange} valueFormat="iso" />
          </label>
          <button
            type="button"
            className="pillButton outline"
            onClick={() => onTagChange(dateYmdLocal())}
          >
            Heute
          </button>
        </div>
      ) : null}
      {preset === "monat" ? (
        <div className="lagerZeitraumFrei">
          <label className="arbeitsauftragFilterField">
            <span>Monat</span>
            <GermanMonthField value={monat} onChange={onMonatChange} />
          </label>
        </div>
      ) : null}
      {preset === "jahr" ? (
        <div className="lagerZeitraumFrei">
          <label className="arbeitsauftragFilterField">
            <span>Jahr</span>
            <input
              type="number"
              min={currentYear - 5}
              max={currentYear + 5}
              value={jahr}
              onChange={(e) => onJahrChange(e.target.value)}
            />
          </label>
        </div>
      ) : null}
      {preset === "zeitraum" ? (
        <div className="lagerZeitraumFrei">
          <label className="arbeitsauftragFilterField">
            <span>Von</span>
            <GermanDateField value={von} onChange={onVonChange} valueFormat="iso" />
          </label>
          <label className="arbeitsauftragFilterField">
            <span>Bis</span>
            <GermanDateField value={bis} onChange={onBisChange} valueFormat="iso" />
          </label>
        </div>
      ) : null}
    </div>
  );
}
