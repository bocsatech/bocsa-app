"use client";

import { USER_POSITION_SUGGESTIONS } from "../../lib/user-position";
import { useIsLocalhost } from "../../lib/use-is-localhost";

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
  const isLocalhost = useIsLocalhost();

  return (
    <>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        list={isLocalhost ? listId : undefined}
      />
      {isLocalhost ? (
        <datalist id={listId}>
          {USER_POSITION_SUGGESTIONS.map((position) => (
            <option key={position} value={position} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}
