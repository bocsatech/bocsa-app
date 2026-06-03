"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

export type PkwPortalStep = "login" | "details" | "slot" | "done";

type Props = {
  step: PkwPortalStep;
  placement: "top" | "dock";
  onBack?: () => void;
  onExit: () => void;
  onBackToStart?: () => void;
  exiting?: boolean;
};

function NavButtons({
  step,
  onBack,
  onExit,
  onBackToStart,
  exiting,
  className,
}: Props & { className: string }) {
  const goStart = onBackToStart ?? onExit;

  if (step === "done") {
    return (
      <div className={className}>
        {onBack ? (
          <button
            type="button"
            className="pkwPortalNavBtn pkwPortalNavBtnOutline"
            disabled={exiting}
            onClick={onBack}
          >
            ← Zurück
          </button>
        ) : null}
        <button
          type="button"
          className="pkwPortalNavBtn pkwPortalNavBtnPrimary"
          disabled={exiting}
          onClick={onExit}
        >
          {exiting ? "…" : "Schließen"}
        </button>
      </div>
    );
  }

  const showStepBack = step === "slot" || step === "details";

  return (
    <div className={className}>
      {step === "login" ? (
        <button
          type="button"
          className="pkwPortalNavBtn pkwPortalNavBtnOutline"
          disabled={exiting}
          onClick={goStart}
        >
          ← Zurück
        </button>
      ) : showStepBack && onBack ? (
        <button
          type="button"
          className="pkwPortalNavBtn pkwPortalNavBtnOutline"
          disabled={exiting}
          onClick={onBack}
        >
          ← Zurück
        </button>
      ) : null}

      <button
        type="button"
        className="pkwPortalNavBtn pkwPortalNavBtnDanger"
        disabled={exiting}
        onClick={onExit}
      >
        {exiting ? "…" : "Beenden"}
      </button>
    </div>
  );
}

export default function PkwPortalNavBar({
  step,
  placement,
  onBack,
  onExit,
  onBackToStart,
  exiting = false,
}: Props) {
  const [dockReady, setDockReady] = useState(false);

  useEffect(() => {
    if (placement !== "dock") return;
    document.documentElement.classList.add("pkw-portal-body");
    document.body.classList.add("pkw-portal-body");
    setDockReady(true);
    return () => {
      document.documentElement.classList.remove("pkw-portal-body");
      document.body.classList.remove("pkw-portal-body");
    };
  }, [placement]);

  const shared = { step, onBack, onExit, onBackToStart, exiting, placement };

  if (placement === "top") {
    return (
      <nav className="pkwPortalStepNav" aria-label="Portal-Navigation">
        <NavButtons {...shared} className="pkwPortalStepNavInner" />
      </nav>
    );
  }

  const dock = (
    <nav className="pkwPortalNavDock" aria-label="Portal-Navigation unten">
      <div className="pkwPortalNavDockInner">
        <NavButtons {...shared} className="pkwPortalNavBar" />
      </div>
    </nav>
  );

  if (!dockReady || typeof document === "undefined") {
    return null;
  }

  return createPortal(dock, document.body);
}
