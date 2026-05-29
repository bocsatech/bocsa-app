import Link from "next/link";
import {
  buildWorkOrderInfoParts,
  formatWorkOrderAuftragNr,
  formatWorkOrderDepot,
  formatWorkOrderHourMeterDisplay,
  formatWorkOrderStatus,
  getWorkOrders,
  workOrderUserLabel,
  type WorkOrder,
} from "../../lib/work-orders";
import type { Machine } from "../../lib/types/machine";

type Props = {
  machine: Machine;
};

export default function MachineWorkOrdersTable({ machine }: Props) {
  const orders = getWorkOrders(machine);

  if (orders.length === 0) {
    return <p className="scanHint">Noch keine Arbeitsaufträge für diese Maschine.</p>;
  }

  return (
    <div className="machineTableScroll">
      <table className="machineTable machineWorkOrdersTable">
        <thead>
          <tr>
            <th>Datum</th>
            <th>Auftrag-Nr.</th>
            <th>Info</th>
            <th>Stundenzählerstand</th>
            <th>Depot</th>
            <th>User</th>
            <th>Status</th>
            <th className="woActionsCol">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <WorkOrderRow key={order.id} machine={machine} order={order} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function WorkOrderRow({ machine, order }: { machine: Machine; order: WorkOrder }) {
  const infoParts = buildWorkOrderInfoParts(order);

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
                {index === 0 && infoParts.length > 1 ? `Info: ${part.text}` : part.text}
              </span>
            ))}
          </div>
        )}
      </td>
      <td className="woHourMeter">{formatWorkOrderHourMeterDisplay(order)}</td>
      <td className="woDepot">{formatWorkOrderDepot(order, machine.depot)}</td>
      <td className="woUser">{workOrderUserLabel(order) || "—"}</td>
      <td className="woStatus">{formatWorkOrderStatus(order)}</td>
      <td className="woActionsCol">
        <div className="woActions">
          <Link
            className="pillButton outline"
            href={`/arbeitsauftrag?machineId=${encodeURIComponent(machine.id)}&auftragId=${encodeURIComponent(order.id)}`}
          >
            Öffnen
          </Link>
          <Link
            className="pillButton outline"
            href={`/arbeitsauftrag?machineId=${encodeURIComponent(machine.id)}&auftragId=${encodeURIComponent(order.id)}&print=1`}
            target="_blank"
          >
            Drucken
          </Link>
        </div>
      </td>
    </tr>
  );
}
