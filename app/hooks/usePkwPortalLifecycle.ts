"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  clearPkwPortalVisit,
  portalPkwLogout,
  portalPkwLogoutBeacon,
} from "../../lib/pkw";

/** Inaktivität oder nach Buchung: automatische Abmeldung */
export const PKW_PORTAL_IDLE_MS = 60_000;
export const PKW_PORTAL_IDLE_SEC = PKW_PORTAL_IDLE_MS / 1000;

/** @deprecated Alias für Countdown-Anzeige */
export const PKW_PORTAL_DONE_LOGOUT_SEC = PKW_PORTAL_IDLE_SEC;

type Options = {
  step: string;
  sessionActive: boolean;
  onSessionEnd?: () => void;
};

export function usePkwPortalLifecycle({ step, sessionActive, onSessionEnd }: Options) {
  const [idleSecondsLeft, setIdleSecondsLeft] = useState(PKW_PORTAL_IDLE_SEC);
  const onSessionEndRef = useRef(onSessionEnd);
  onSessionEndRef.current = onSessionEnd;

  const endSession = useCallback(async (redirectStart: boolean) => {
    clearPkwPortalVisit();
    await portalPkwLogout().catch(() => {});
    onSessionEndRef.current?.();
    if (redirectStart) {
      window.location.assign("/start");
    }
  }, []);

  const endSessionRef = useRef(endSession);
  endSessionRef.current = endSession;

  const bumpIdleRef = useRef<() => void>(() => {});

  useEffect(() => {
    function handlePageHide(event: PageTransitionEvent) {
      if (event.persisted) return;
      clearPkwPortalVisit();
      portalPkwLogoutBeacon();
    }

    window.addEventListener("pagehide", handlePageHide);
    return () => window.removeEventListener("pagehide", handlePageHide);
  }, []);

  useEffect(() => {
    if (!sessionActive || step === "login") {
      setIdleSecondsLeft(PKW_PORTAL_IDLE_SEC);
      return;
    }

    setIdleSecondsLeft(PKW_PORTAL_IDLE_SEC);
    let timeout = window.setTimeout(() => {
      void endSessionRef.current(true);
    }, PKW_PORTAL_IDLE_MS);

    function bumpIdleTimer() {
      window.clearTimeout(timeout);
      setIdleSecondsLeft(PKW_PORTAL_IDLE_SEC);
      timeout = window.setTimeout(() => {
        void endSessionRef.current(true);
      }, PKW_PORTAL_IDLE_MS);
    }

    bumpIdleRef.current = bumpIdleTimer;
    bumpIdleTimer();

    window.addEventListener("pointerdown", bumpIdleTimer);
    window.addEventListener("keydown", bumpIdleTimer);
    window.addEventListener("touchstart", bumpIdleTimer);
    window.addEventListener("scroll", bumpIdleTimer, { passive: true });

    const tick = window.setInterval(() => {
      setIdleSecondsLeft((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);

    return () => {
      window.clearTimeout(timeout);
      window.clearInterval(tick);
      window.removeEventListener("pointerdown", bumpIdleTimer);
      window.removeEventListener("keydown", bumpIdleTimer);
      window.removeEventListener("touchstart", bumpIdleTimer);
      window.removeEventListener("scroll", bumpIdleTimer);
      bumpIdleRef.current = () => {};
    };
  }, [step, sessionActive]);

  return { idleSecondsLeft, bumpIdle: () => bumpIdleRef.current() };
}
