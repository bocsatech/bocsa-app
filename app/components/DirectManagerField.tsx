"use client";

import {
  directManagerSelectValue,
  resolveDirectManagerFormValue,
  supervisorUserLabel,
} from "../../lib/user-position";
import { UserFormSelect } from "./UserFormField";

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
  const options = supervisors.filter((supervisor) => supervisor.id !== excludeUserId);
  const resolvedValue = resolveDirectManagerFormValue(value, options);
  const hasLegacyValue =
    resolvedValue !== "" && !options.some((supervisor) => supervisor.id === resolvedValue);

  return (
    <UserFormSelect
      label="Direkter Vorgesetzter"
      value={hasLegacyValue ? resolvedValue : resolvedValue || ""}
      onChange={onChange}
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
    </UserFormSelect>
  );
}
