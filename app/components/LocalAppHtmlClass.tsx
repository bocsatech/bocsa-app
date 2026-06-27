"use client";

import { useEffect } from "react";
import { isLocalAppEnvironment } from "../../lib/local-host";

/** Setzt `local-app` auf `<html>` — nur localhost/dev (CSS-Gates). */
export default function LocalAppHtmlClass() {
  useEffect(() => {
    if (!isLocalAppEnvironment()) return;
    document.documentElement.classList.add("local-app");
    return () => {
      document.documentElement.classList.remove("local-app");
    };
  }, []);

  return null;
}
