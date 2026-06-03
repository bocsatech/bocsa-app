"use client";

import { formatLagerNumber } from "../../lib/lager";
import { getLagerBestandAlert, parseLagerMenge } from "../../lib/lager-bestand";
import type { LagerTeil } from "../../lib/types/lager";

type Props = {
  teil: LagerTeil;
};

export default function LagerMengeMinCell({ teil }: Props) {
  const min = parseLagerMenge(teil.menge_min);
  const alert = getLagerBestandAlert(teil);
  const below = alert === "below_min" && min != null;

  if (min == null) {
    return <span className="lagerGrenzeEmpty">—</span>;
  }

  return (
    <span className={`lagerGrenzeValue${below ? " lagerGrenzeValueWarn" : ""}`} title={below ? "Unter Mindestmenge" : undefined}>
      {formatLagerNumber(min)}
      {below ? <span className="lagerGrenzeWarnMark" aria-hidden> ⚠</span> : null}
    </span>
  );
}
