"use client";

import { useEffect } from "react";

const MQ = "(max-width: 760px)";
const CLS = "kunden-route-mobile";

/** Nur /kunden: Mobil natürliches Scrollen, keine App-Shell-Scroll-Käfige. */
export function useKundenMobileBody() {
  useEffect(() => {
    const mq = window.matchMedia(MQ);
    const sync = () => {
      const on = mq.matches;
      document.documentElement.classList.toggle(CLS, on);
      document.body.classList.toggle(CLS, on);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => {
      mq.removeEventListener("change", sync);
      document.documentElement.classList.remove(CLS);
      document.body.classList.remove(CLS);
    };
  }, []);
}
