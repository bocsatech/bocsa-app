"use client";

import { useEffect } from "react";

export default function PwaRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => reg.update())
      .catch(() => {
        /* optional — install still works on iOS via manifest */
      });
  }, []);

  return null;
}
