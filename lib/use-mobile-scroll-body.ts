"use client";

import { useEffect } from "react";

/** Zuverlässiges Mobil-Scrollen in AppPageShell (ohne :has()-Abhängigkeit). */
export function useAppShellScrollBody(active = true) {
  useEffect(() => {
    if (!active) return;
    document.documentElement.classList.add("app-shell-root");
    document.body.classList.add("app-shell-body");
    return () => {
      document.documentElement.classList.remove("app-shell-root");
      document.body.classList.remove("app-shell-body");
    };
  }, [active]);
}

/** Öffentliche Seiten ohne Sidebar (QR-Meldung). */
export function usePublicScrollBody(active = true) {
  useEffect(() => {
    if (!active) return;
    document.body.classList.add("public-scroll-body");
    return () => {
      document.body.classList.remove("public-scroll-body");
    };
  }, [active]);
}
