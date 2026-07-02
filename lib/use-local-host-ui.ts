"use client";

import { useSyncExternalStore } from "react";
import { isLocalAppEnvironment, isLocalHostEnvironment } from "./local-host";

const subscribeNoop = () => () => {};

/** Szinkron localhost hostname (next start + npm run dev localhoston). */
export function useLocalHostEnvironment() {
  return useSyncExternalStore(subscribeNoop, isLocalHostEnvironment, () => false);
}

/** Localhost hostname vagy NODE_ENV=development. */
export function useLocalAppEnvironment() {
  return useSyncExternalStore(subscribeNoop, isLocalAppEnvironment, () => false);
}
