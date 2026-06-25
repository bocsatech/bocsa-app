"use client";

import { useSyncExternalStore } from "react";
import { isLocalDevEnvironment, resolveLocalhostPickerVariant } from "./local-host";

export function useLocalhostPickerVariant(explicit?: "native" | "calendar") {
  const getClientSnapshot = () => resolveLocalhostPickerVariant(explicit);
  const getServerSnapshot = () => {
    if (explicit === "native") return "native" as const;
    if (isLocalDevEnvironment()) return "calendar" as const;
    return "native" as const;
  };
  return useSyncExternalStore(() => () => {}, getClientSnapshot, getServerSnapshot);
}
