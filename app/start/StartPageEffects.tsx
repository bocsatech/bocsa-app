"use client";

import { usePublicScrollBody } from "../../lib/use-mobile-scroll-body";

/** Mobil: body scrollbar (wie Login/QR) — sofort beim Laden, nicht erst nach Hydration der Karten. */
export default function StartPageEffects() {
  usePublicScrollBody(true);
  return null;
}
