"use client";

import { useEffect } from "react";
import {
  hasExtendedAppFeatures,
  isLocalAppEnvironment,
  isLocalHostEnvironment,
} from "../../lib/local-host";

/** Setzt `local-app` / `local-host` auf `<html>` — extended UI (CSS-Gates). */
export default function LocalAppHtmlClass() {
  useEffect(() => {
    const root = document.documentElement;
    if (hasExtendedAppFeatures()) {
      root.classList.add("local-app");
    }
    if (isLocalHostEnvironment()) {
      root.classList.add("local-host");
    }
    if (isLocalAppEnvironment()) {
      root.classList.add("local-dev-ui");
    }
    return () => {
      root.classList.remove("local-app", "local-host", "local-dev-ui");
    };
  }, []);

  return null;
}
