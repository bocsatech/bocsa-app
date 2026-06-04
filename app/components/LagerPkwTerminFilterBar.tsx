"use client";

import { dateYmdLocal } from "../../lib/pkw";
import type { PkwTerminZeitraumPreset } from "../../lib/lager-pkw-termine";

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
            <input type="date" value={tag} onChange={(e) => onTagChange(e.target.value)} />
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
            <input type="month" value={monat} onChange={(e) => onMonatChange(e.target.value)} />
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
            <input type="date" value={von} onChange={(e) => onVonChange(e.target.value)} />
          </label>
          <label className="arbeitsauftragFilterField">
            <span>Bis</span>
            <input type="date" value={bis} onChange={(e) => onBisChange(e.target.value)} />
          </label>
        </div>
      ) : null}
    </div>
  );
}
