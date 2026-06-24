"use client";

import { useSyncExternalStore } from "react";
import { resolveLocalhostPickerVariant } from "./local-host";

/** SSR-safe: server = native, client localhost = calendar (ohne Hydration-Flash). */
export function useLocalhostPickerVariant(explicit?: "native" | "calendar") {
  return useSyncExternalStore(
    () => () => {},
    () => resolveLocalhostPickerVariant(explicit),
    () => "native" as const
  );
}
