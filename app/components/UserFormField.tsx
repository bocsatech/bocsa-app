"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import { useIsLocalhost } from "../../lib/use-is-localhost";

export function useFormPlaceholder(fallback: string) {
  const isLocalhost = useIsLocalhost();
  return isLocalhost ? "" : fallback;
}

type UserFormFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export default function UserFormField({ label, children, className }: UserFormFieldProps) {
  const isLocalhost = useIsLocalhost();
  if (!isLocalhost) {
    return <>{children}</>;
  }

  return (
    <div className={`userFormField${className ? ` ${className}` : ""}`}>
      <span className="userFormFieldLabel">{label}</span>
      <div className="userFormFieldControl">{children}</div>
    </div>
  );
}

type UserFormTextInputProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  inputMode?: "numeric" | "text" | "tel" | "email";
  pattern?: string;
  maxLength?: number;
  minLength?: number;
  autoComplete?: string;
  required?: boolean;
  step?: string;
};

export function UserFormTextInput({
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: UserFormTextInputProps) {
  const placeholder = useFormPlaceholder(label);

  return (
    <UserFormField label={label}>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        {...rest}
      />
    </UserFormField>
  );
}

type UserFormTextareaProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
};

export function UserFormTextarea({ label, value, onChange, rows = 3 }: UserFormTextareaProps) {
  const placeholder = useFormPlaceholder(label);

  return (
    <UserFormField label={label}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    </UserFormField>
  );
}

type UserFormSelectProps = {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
} & Pick<SelectHTMLAttributes<HTMLSelectElement>, "required">;

export function UserFormSelect({ label, value, onChange, children, required }: UserFormSelectProps) {
  const isLocalhost = useIsLocalhost();
  const select = (
    <select value={value} onChange={(event) => onChange(event.target.value)} required={required}>
      {children}
    </select>
  );

  if (isLocalhost) {
    return <UserFormField label={label}>{select}</UserFormField>;
  }

  return (
    <label className="userFilialeField">
      <span>{label}</span>
      {select}
    </label>
  );
}
