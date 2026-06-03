"use client";

import Link from "next/link";
import {
  BUCHUNG_SOURCE_LABELS,
  BUCHUNG_STATUS_LABELS,
  formatKundeName,
  formatSlotLabel,
} from "../../lib/pkw";
import type { PkwBuchung, PkwFahrzeug } from "../../lib/types/pkw";

type Props = {
  fahrzeug: PkwFahrzeug;
  buchungen: PkwBuchung[];
  serviceLabels?: Record<string, string>;
};

export default function PkwBuchungenTable({ fahrzeug, buchungen, serviceLabels = {} }: Props) {
  const sorted = [...buchungen].sort(
    (a, b) => new Date(b.slot_start).getTime() - new Date(a.slot_start).getTime()
  );

  if (sorted.length === 0) {
    return <p className="scanHint">Noch keine Service-Termine für dieses Fahrzeug.</p>;
  }

  return (
    <div className="machineTableScroll">
      <table className="machineTable machineWorkOrdersTable">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Termin</th>
            <th>Info</th>
            <th>Km-Stand</th>
            <th>Platz</th>
            <th>Quelle</th>
            <th>Status</th>
            <th className="woActionsCol">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((buchung) => (
            <BuchungRow
              key={buchung.id}
              buchung={buchung}
              fahrzeug={fahrzeug}
              serviceLabels={serviceLabels}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BuchungRow({
  buchung,
  fahrzeug,
  serviceLabels,
}: {
  buchung: PkwBuchung;
  fahrzeug: PkwFahrzeug;
  serviceLabels: Record<string, string>;
}) {
  const serviceText =
    buchung.servicearten.length > 0
      ? buchung.servicearten.map((key) => serviceLabels[key] ?? key).join(", ")
      : null;
  const kundeLabel = buchung.kunde ? formatKundeName(buchung.kunde) : null;

  return (
    <tr>
      <td className="woDate">{formatSlotLabel(buchung.slot_start)}</td>
      <td className="woAuftragNr">{fahrzeug.kennzeichen}</td>
      <td className="woInfoCell">
        <div className="woInfoStack">
          {serviceText ? <span className="woInfoBlue">{serviceText}</span> : null}
          {buchung.problem_text ? <span className="woInfoGreen">{buchung.problem_text}</span> : null}
          {kundeLabel ? <span>{kundeLabel}</span> : null}
        </div>
      </td>
      <td className="woHourMeter">
        {buchung.km_stand != null ? `${buchung.km_stand} km` : "—"}
      </td>
      <td className="woDepot">
        {buchung.platz_nummer != null ? `Platz ${buchung.platz_nummer}` : "—"}
      </td>
      <td className="woUser">{BUCHUNG_SOURCE_LABELS[buchung.source] ?? buchung.source}</td>
      <td className="woStatus">{BUCHUNG_STATUS_LABELS[buchung.status] ?? buchung.status}</td>
      <td className="woActionsCol">
        <div className="woActions">
          <Link className="pillButton outline" href={`/pkw-service?kennzeichen=${encodeURIComponent(fahrzeug.kennzeichen)}`}>
            Öffnen
          </Link>
        </div>
      </td>
    </tr>
  );
}
