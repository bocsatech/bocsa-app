"use client";

import { useEffect } from "react";
import { clearPkwPortalVisit, portalPkwLogout } from "../../lib/pkw";

/** Auf /start: Portal-Session immer beenden (Tab-Wechsel ohne pagehide). */
export default function PkwPortalSessionJanitor() {
  useEffect(() => {
    clearPkwPortalVisit();
    void portalPkwLogout().catch(() => {});
  }, []);

  return null;
}
