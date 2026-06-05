"use client";

import { useEffect } from "react";
import { usePublicScrollBody } from "../../lib/use-mobile-scroll-body";

/** Mobil: body scroll sofort (wie Login), ohne :has() / fixed viewport. */
export default function StartPageEffects() {
  usePublicScrollBody(true);

  useEffect(() => {
    document.documentElement.classList.add("start-route");
    document.body.classList.add("start-route");
    return () => {
      document.documentElement.classList.remove("start-route");
      document.body.classList.remove("start-route");
    };
  }, []);

  return null;
}
