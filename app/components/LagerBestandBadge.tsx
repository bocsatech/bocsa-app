"use client";

import Link from "next/link";
import { getLagerBestandAlert, lagerBestandAlertLabel } from "../../lib/lager-bestand";
import type { LagerTeil } from "../../lib/types/lager";

type Props = {
  teil: LagerTeil;
  linkToMeldungen?: boolean;
};

export default function LagerBestandBadge({ teil, linkToMeldungen = false }: Props) {
  const alert = getLagerBestandAlert(teil);
  if (!alert) return null;

  const className =
    alert === "below_min" ? "lagerBestandBadge belowMin" : "lagerBestandBadge aboveMax";
  const label = lagerBestandAlertLabel(alert);

  if (linkToMeldungen) {
    return (
      <Link href="/lager/meldungen" className={className} title={label}>
        {label}
      </Link>
    );
  }

  return (
    <span className={className} title={label}>
      {label}
    </span>
  );
}
