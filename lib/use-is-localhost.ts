"use client";

import { useSyncExternalStore } from "react";
import { isLocalAppEnvironment, isLocalDevEnvironment } from "./local-host";

export function useIsLocalhost() {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      window.addEventListener("popstate", onStoreChange);
      return () => window.removeEventListener("popstate", onStoreChange);
    },
    isLocalAppEnvironment,
    isLocalDevEnvironment
  );
}
