"use client";

import { USER_POSITION_SUGGESTIONS } from "../../lib/user-position";
import UserFormField from "./UserFormField";

type UserPositionFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  listId?: string;
};

export default function UserPositionField({
  value,
  onChange,
  placeholder = "Position / Funktion",
  listId = "user-position-suggestions",
}: UserPositionFieldProps) {
  return (
    <UserFormField label={placeholder}>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder=""
        list={listId}
      />
      <datalist id={listId}>
        {USER_POSITION_SUGGESTIONS.map((position) => (
          <option key={position} value={position} />
        ))}
      </datalist>
    </UserFormField>
  );
}
