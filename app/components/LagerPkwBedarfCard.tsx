"use client";

import Link from "next/link";
import { formatLagerNumber, formatLagerValue } from "../../lib/lager";
import {
  formatLagerFahrzeugTermin,
  type LagerFahrzeugBedarfZeile,
} from "../../lib/lager-pkw-bedarf";

type Props = {
  row: LagerFahrzeugBedarfZeile;
};

export default function LagerPkwBedarfCard({ row }: Props) {
  const { teil, bedarfMenge, lagerstand, fehlmenge, fahrzeuge } = row;

  return (
    <article className="lagerPkwBedarfCard lagerMeldungRowBelow">
      <div className="lagerPkwBedarfCardHead">
        <strong>{formatLagerValue(teil.herstellernummer)}</strong>
        <span className="lagerPkwBedarfCardName">{teil.bezeichnung?.trim() ?? ""}</span>
      </div>
      <dl className="lagerPkwBedarfCardStats">
        <div>
          <dt>Bedarf</dt>
          <dd>{formatLagerNumber(bedarfMenge)}</dd>
        </div>
        <div>
          <dt>Lagerstand</dt>
          <dd>{formatLagerNumber(lagerstand)}</dd>
        </div>
        <div>
          <dt>Fehlmenge</dt>
          <dd className="lagerFehlmenge">{formatLagerNumber(fehlmenge)}</dd>
        </div>
      </dl>
      <div className="lagerPkwBedarfCardTermine">
        {fahrzeuge.map((fz) => (
          <p key={fz.fahrzeugId} className="lagerFahrzeugTerminLine">
            {formatLagerFahrzeugTermin(fz)}
          </p>
        ))}
      </div>
      <Link
        className="pillButton outline lagerPkwBedarfCardBtn"
        href={`/lager?teil=${encodeURIComponent(teil.id)}`}
      >
        Teil öffnen
      </Link>
    </article>
  );
}
