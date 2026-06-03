"use client";

import { useEffect, useState } from "react";
import { canShowInstallPrompt, isAndroid, isIosSafari, isStandaloneDisplay } from "../../lib/pwa";

type Props = {
  /** Kompakter Text unter QR */
  compact?: boolean;
};

export default function PwaInstallHint({ compact = false }: Props) {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const key = "bocsa_pwa_hint_dismissed";
    if (sessionStorage.getItem(key) === "1") {
      setDismissed(true);
      return;
    }
    setVisible(canShowInstallPrompt());
  }, []);

  if (!visible || dismissed || isStandaloneDisplay()) return null;

  function dismiss() {
    sessionStorage.setItem("bocsa_pwa_hint_dismissed", "1");
    setDismissed(true);
  }

  if (compact) {
    return (
      <p className="pwaInstallHint pwaInstallHintCompact">
        <strong>App auf dem Handy:</strong>{" "}
        {isIosSafari()
          ? "Teilen → „Zum Home-Bildschirm“"
          : isAndroid()
            ? "Menü → „App installieren“ oder „Zum Startbildschirm“"
            : "Browser-Menü → „App installieren“"}
        <button type="button" className="pwaInstallDismiss" onClick={dismiss} aria-label="Hinweis schließen">
          ×
        </button>
      </p>
    );
  }

  return (
    <aside className="pwaInstallHint card">
      <h3 className="pwaInstallTitle">Als App auf dem Handy</h3>
      <p className="subtitle">
        Einmal hinzufügen — danach Terminbuchung wie eine App (ohne App Store).
      </p>
      {isIosSafari() ? (
        <ol className="pwaInstallSteps">
          <li>
            Unten auf <strong>Teilen</strong> tippen
          </li>
          <li>
            <strong>Zum Home-Bildschirm</strong> wählen
          </li>
          <li>
            <strong>Hinzufügen</strong> bestätigen
          </li>
        </ol>
      ) : isAndroid() ? (
        <ol className="pwaInstallSteps">
          <li>Browser-Menü (⋮) öffnen</li>
          <li>
            <strong>App installieren</strong> oder <strong>Zum Startbildschirm</strong>
          </li>
        </ol>
      ) : (
        <p className="subtitle">Im Browser: Menü → „App installieren“ (falls angeboten).</p>
      )}
      <button type="button" className="secondaryBtn" onClick={dismiss}>
        Verstanden
      </button>
    </aside>
  );
}
