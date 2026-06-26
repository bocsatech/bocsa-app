"use client";

import {
  directManagerSelectValue,
  resolveDirectManagerFormValue,
  supervisorUserLabel,
} from "../../lib/user-position";
import { useIsLocalhost } from "../../lib/use-is-localhost";

export type SupervisorOption = {
  id: string;
  username?: string | null;
  full_name?: string | null;
  position?: string | null;
};

type DirectManagerFieldProps = {
  value: string;
  onChange: (value: string) => void;
  supervisors: SupervisorOption[];
  excludeUserId?: string | null;
};

export default function DirectManagerField({
  value,
  onChange,
  supervisors,
  excludeUserId,
}: DirectManagerFieldProps) {
  const isLocalhost = useIsLocalhost();
  const options = supervisors.filter((supervisor) => supervisor.id !== excludeUserId);
  const resolvedValue = resolveDirectManagerFormValue(value, options);
  const hasLegacyValue =
    resolvedValue !== "" && !options.some((supervisor) => supervisor.id === resolvedValue);

  if (!isLocalhost) {
    return (
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Direkter Vorgesetzter"
      />
    );
  }

  return (
    <label className="userFilialeField">
      <span>Direkter Vorgesetzter</span>
      <select
        value={hasLegacyValue ? resolvedValue : resolvedValue || ""}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">— kein Vorgesetzter —</option>
        {hasLegacyValue ? (
          <option value={resolvedValue}>{resolvedValue} (bisheriger Wert)</option>
        ) : null}
        {options.map((supervisor) => (
          <option key={supervisor.id} value={directManagerSelectValue(supervisor)}>
            {supervisorUserLabel(supervisor)}
          </option>
        ))}
      </select>
      {options.length === 0 ? (
        <span className="documentEmptyHint">
          Keine Vorgesetzten — Position „Vorgesetzter“ bei mindestens einem Benutzer setzen.
        </span>
      ) : null}
    </label>
  );
}
