"use client";

import { useEffect } from "react";
import { hasExtendedAppFeatures } from "../../lib/local-host";

/** Setzt `local-app` auf `<html>` — extended UI (CSS-Gates). */
export default function LocalAppHtmlClass() {
  useEffect(() => {
    if (!hasExtendedAppFeatures()) return;
    document.documentElement.classList.add("local-app");
    return () => {
      document.documentElement.classList.remove("local-app");
    };
  }, []);

  return null;
}
