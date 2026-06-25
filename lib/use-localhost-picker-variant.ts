"use client";

import { useSyncExternalStore } from "react";
import { resolveLocalhostPickerVariant } from "./local-host";

export function useLocalhostPickerVariant(explicit?: "native" | "calendar") {
  const getSnapshot = () => resolveLocalhostPickerVariant(explicit);
  return useSyncExternalStore(() => () => {}, getSnapshot, getSnapshot);
}
