"use client";

import Link from "next/link";
import { useEffect } from "react";
import HomeMenuIcon from "../components/HomeMenuIcons";
import { isStandaloneDisplay, isIosSafari } from "../../lib/pwa";

export default function StartCardsClient() {
  const standalone = isStandaloneDisplay() || isIosSafari();

  useEffect(() => {
    document.documentElement.classList.add("pwa-start-route-root");
    document.body.classList.add("pwa-start-route");
    return () => {
      document.documentElement.classList.remove("pwa-start-route-root");
      document.body.classList.remove("pwa-start-route");
    };
  }, []);

  return (
    <div className="pwaStartGrid">
      <Link href="/pkw/buchen" className="pwaStartCard pwaStartCardKunde">
        <span className="pwaStartCardIconSvg" aria-hidden>
          <HomeMenuIcon name="pkw" />
        </span>
        <strong>Kunde</strong>
        <span className="pwaStartCardDesc">Termin buchen (Kennzeichen + PIN)</span>
      </Link>

      {!standalone ? (
        <Link href="/login" className="pwaStartCard pwaStartCardTeam">
          <span className="pwaStartCardIconSvg" aria-hidden>
            <HomeMenuIcon name="pkw-service" />
          </span>
          <strong>Mitarbeiter</strong>
          <span className="pwaStartCardDesc">Login für Werkstatt, Lager, PKW-Service</span>
        </Link>
      ) : null}
    </div>
  );
}
