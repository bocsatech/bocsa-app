"use client";

import Link from "next/link";
import { useState } from "react";
import {
  buildWorkOrderInfoParts,
  formatWorkOrderAuftragNr,
  formatWorkOrderDepot,
  formatWorkOrderHourMeterDisplay,
  getWorkOrders,
  workOrderUserLabel,
  type WorkOrder,
} from "../../lib/work-orders";
import { resolveOrderRepairStatus } from "../../lib/geraetstatus";
import type { Machine } from "../../lib/types/machine";
import { buildArbeitsauftragDetailHref } from "../../lib/arbeitsauftrag-routes";
import GeraetstatusSelect from "./GeraetstatusSelect";

type Props = {
  machine: Machine;
  canDeleteAdmin?: boolean;
  onOrderDeleted?: () => void;
};

export default function MachineWorkOrdersTable({
  machine,
  canDeleteAdmin = false,
  onOrderDeleted,
}: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const orders = getWorkOrders(machine);

  async function handleDelete(order: WorkOrder) {
    const nr = formatWorkOrderAuftragNr(order);
    const confirmed = window.confirm(`Auftrag „${nr}" wirklich löschen?`);
    if (!confirmed) return;

    setDeletingId(order.id);
    setDeleteError(null);
    const response = await fetch(
      `/api/machines/${machine.id}/work-orders/${order.id}`,
      { method: "DELETE", credentials: "include" }
    );
    const result = await response.json().catch(() => ({}));
    setDeletingId(null);

    if (!response.ok) {
      setDeleteError(result.error ?? "Auftrag konnte nicht gelöscht werden.");
      return;
    }

    onOrderDeleted?.();
  }

  if (orders.length === 0) {
    return <p className="scanHint">Noch keine Arbeitsaufträge für diese Maschine.</p>;
  }

  return (
    <>
      {deleteError ? <p className="protocolNotice">{deleteError}</p> : null}
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
              <th>Gerätstatus</th>
              <th className="woActionsCol">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <WorkOrderRow
                key={order.id}
                machine={machine}
                order={order}
                canDeleteAdmin={canDeleteAdmin}
                deleting={deletingId === order.id}
                onDelete={() => handleDelete(order)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function WorkOrderRow({
  machine,
  order,
  canDeleteAdmin,
  deleting,
  onDelete,
}: {
  machine: Machine;
  order: WorkOrder;
  canDeleteAdmin: boolean;
  deleting: boolean;
  onDelete: () => void;
}) {
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
      <td className="woStatus">
        <GeraetstatusSelect
          value={resolveOrderRepairStatus(order, machine)}
          readOnly
        />
      </td>
      <td className="woActionsCol">
        <div className="woActions">
          <Link
            className="pillButton outline"
            href={buildArbeitsauftragDetailHref({
              machineId: machine.id,
              auftragId: order.id,
            })}
          >
            Öffnen
          </Link>
          <Link
            className="pillButton outline"
            href={buildArbeitsauftragDetailHref({
              machineId: machine.id,
              auftragId: order.id,
              print: true,
            })}
            target="_blank"
          >
            Drucken
          </Link>
          {canDeleteAdmin ? (
            <button
              type="button"
              className="pillButton outline"
              onClick={onDelete}
              disabled={deleting}
            >
              {deleting ? "…" : "Löschen"}
            </button>
          ) : null}
        </div>
      </td>
    </tr>
  );
}
