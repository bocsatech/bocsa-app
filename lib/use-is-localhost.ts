"use client";

import { useSyncExternalStore } from "react";
import { isLocalDevEnvironment, isLocalHostEnvironment } from "./local-host";

function isLocalAppEnvironment() {
  return isLocalHostEnvironment() || isLocalDevEnvironment();
}

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
