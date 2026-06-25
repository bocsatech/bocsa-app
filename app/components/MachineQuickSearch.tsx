"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  resultCount: number;
  disabled?: boolean;
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden focusable="false">
      <path
        fill="currentColor"
        d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"
      />
    </svg>
  );
}

export default function MachineQuickSearch({
  value,
  onChange,
  onSubmit,
  resultCount,
  disabled = false,
}: Props) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const trimmed = value.trim();
  const isMac =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform);

  useEffect(() => {
    function onGlobalKeyDown(event: globalThis.KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      if (disabled) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("[contenteditable='true']") ||
          (target.tagName === "INPUT" &&
            !(target as HTMLInputElement).classList.contains("machineQuickSearchInput")) ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }

    window.addEventListener("keydown", onGlobalKeyDown);
    return () => window.removeEventListener("keydown", onGlobalKeyDown);
  }, [disabled]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      onSubmit();
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onChange("");
      inputRef.current?.blur();
    }
  }

  return (
    <div className="machineQuickSearch">
      <label className="machineQuickSearchLabel" htmlFor={inputId}>
        Maschinen suchen
      </label>
      <div className={`machineQuickSearchField${disabled ? " isDisabled" : ""}`}>
        <span className="machineQuickSearchIcon" aria-hidden>
          <SearchIcon />
        </span>
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          className="machineQuickSearchInput"
          value={value}
          disabled={disabled}
          placeholder="Gerätenummer, Seriennummer, Bezeichnung, Depot…"
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="go"
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
        />
        <kbd className="machineQuickSearchShortcut" aria-hidden>
          {isMac ? "⌘K" : "Ctrl+K"}
        </kbd>
      </div>
      {trimmed ? (
        <p className="machineQuickSearchMeta" aria-live="polite">
          <strong>{resultCount}</strong> Treffer
          {resultCount > 0 ? " · Enter öffnet den ersten" : " · Keine Maschine gefunden"}
        </p>
      ) : null}
    </div>
  );
}
