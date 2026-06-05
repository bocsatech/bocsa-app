"use client";

import { useEffect } from "react";
import { usePublicScrollBody } from "../../lib/use-mobile-scroll-body";

/** Nur Mobil: iOS/PWA-Scroll auf /start — Desktop-Layout unverändert. */
export default function StartPageEffects() {
  usePublicScrollBody(true);

  useEffect(() => {
    document.documentElement.classList.add("pwa-start-route-root");
    document.body.classList.add("pwa-start-route");
    return () => {
      document.documentElement.classList.remove("pwa-start-route-root");
      document.body.classList.remove("pwa-start-route");
    };
  }, []);

  return null;
}
