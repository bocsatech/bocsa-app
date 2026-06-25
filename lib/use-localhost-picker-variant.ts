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

  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      // npm start localhost: SSR native → kliens calendar (egy frame után frissít)
      const id = window.requestAnimationFrame(onStoreChange);
      return () => window.cancelAnimationFrame(id);
    },
    getClientSnapshot,
    getServerSnapshot
  );
}
