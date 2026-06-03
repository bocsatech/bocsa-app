"use client";

import Link from "next/link";
import {
  buildWorkOrderInfoParts,
  formatWorkOrderAuftragNr,
  formatWorkOrderStatus,
  workOrderUserLabel,
  type WorkOrder,
} from "../../lib/work-orders";
import { buildPkwArbeitsauftragDetailHref } from "../../lib/pkw-arbeitsauftrag-routes";
import type { PkwFahrzeug } from "../../lib/types/pkw";

type Props = {
  fahrzeug: PkwFahrzeug;
  orders: WorkOrder[];
};

export default function PkwWorkOrdersTable({ fahrzeug, orders }: Props) {
  if (orders.length === 0) {
    return <p className="scanHint">Noch keine Arbeitsaufträge für dieses Fahrzeug.</p>;
  }

  return (
    <div className="machineTableScroll">
      <table className="machineTable machineWorkOrdersTable">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Auftrag-Nr.</th>
            <th>Info</th>
            <th>Km-Stand</th>
            <th>User</th>
            <th>Status</th>
            <th className="woActionsCol">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <WorkOrderRow key={order.id} fahrzeug={fahrzeug} order={order} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkOrderRow({ fahrzeug, order }: { fahrzeug: PkwFahrzeug; order: WorkOrder }) {
  const infoParts = buildWorkOrderInfoParts(order);
  const km =
    order.hourMeterMachine?.trim() ||
    order.hourMeterReturn?.trim() ||
    (fahrzeug.km_stand != null ? String(fahrzeug.km_stand) : "");

  return (
    <tr>
      <td className="woDate">{order.date || "—"}</td>
      <td className="woAuftragNr">{formatWorkOrderAuftragNr(order)}</td>
      <td className="woInfoCell">
        {infoParts.length === 0 ? (
          "—"
        ) : (
          <div className="woInfoStack">
            {infoParts.map((part, index) => (
              <span
                key={`${order.id}-info-${index}`}
                className={
                  part.tone === "blue"
                    ? "woInfoBlue"
                    : part.tone === "green"
                      ? "woInfoGreen"
                      : undefined
                }
              >
                {part.text}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="woHourMeter">{km ? `${km} km` : "—"}</td>
      <td className="woUser">{workOrderUserLabel(order) || "—"}</td>
      <td className="woStatus">{formatWorkOrderStatus(order)}</td>
      <td className="woActionsCol">
        <div className="woActions">
          <Link
            className="pillButton outline"
            href={buildPkwArbeitsauftragDetailHref({
              fahrzeugId: fahrzeug.id,
              auftragId: order.id,
            })}
          >
            Öffnen
          </Link>
          <Link
            className="pillButton outline"
            href={buildPkwArbeitsauftragDetailHref({
              fahrzeugId: fahrzeug.id,
              auftragId: order.id,
              print: true,
            })}
            target="_blank"
          >
            Drucken
          </Link>
        </div>
      </td>
    </tr>
  );
}
