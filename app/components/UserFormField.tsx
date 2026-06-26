"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";

export function useFormPlaceholder(_fallback: string) {
  return "";
}

type UserFormFieldProps = {
  label: string;
  children: ReactNode;
  className?: string;
};

export default function UserFormField({ label, children, className }: UserFormFieldProps) {
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
  return (
    <UserFormField label={label}>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder=""
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
  return (
    <UserFormField label={label}>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder=""
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
  return (
    <UserFormField label={label}>
      <select value={value} onChange={(event) => onChange(event.target.value)} required={required}>
        {children}
      </select>
    </UserFormField>
  );
}
