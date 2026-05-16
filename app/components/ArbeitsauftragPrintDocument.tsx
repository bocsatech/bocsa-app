"use client";

import { collectCheckedRepairLabels } from "../../lib/arbeitsauftrag-protokoll";
import { formatValue, hasValue, type StammdatenField } from "../../lib/machines";
import { formatLagerNumber } from "../../lib/lager";
import { formatOrderType, type WorkOrder } from "../../lib/work-orders";
import type { Machine } from "../../lib/types/machine";

type Props = {
  machine: Machine;
  order: WorkOrder;
  stammdatenFields: StammdatenField[];
  username?: string;
};

export default function ArbeitsauftragPrintDocument({
  machine,
  order,
  stammdatenFields,
  username,
}: Props) {
  const visibleStammdaten = stammdatenFields.filter((field) => hasValue(field.value));
  const bearbeiter = order.updatedBy || order.createdBy || username || "—";
  const checkedRepairLabels = collectCheckedRepairLabels(order.protocol);

  return (
    <div className="arbeitsauftragDocument aaForm aaFormView">
      <header className="arbeitsauftragPrintHeader aaHeader">
        <div className="aaHeaderPrintSummary">
          <h2 className="aaDocTitle arbeitsauftragPrintTitle">ARBEITSAUFTRAG</h2>
          <div className="aaHeaderCols">
            <div>
              <p className="aaColLabel">Gerätenummer</p>
              <p className="aaGeraetNr">{formatValue(machine.geraetenummer)}</p>
              <p className="aaGeraetTitle">
                {formatValue(machine.bezeichnung || machine.subgroup)}
              </p>
            </div>
            <dl className="arbeitsauftragPrintMeta">
              <div>
                <dt>Auftragsart</dt>
                <dd>{formatOrderType(order.type)}</dd>
              </div>
              <div>
                <dt>Datum</dt>
                <dd>{order.date || "—"}</dd>
              </div>
              <div>
                <dt>Uhrzeit</dt>
                <dd>{order.time || "—"}</dd>
              </div>
              <div>
                <dt>Depot</dt>
                <dd>{formatValue(order.depot || machine.depot)}</dd>
              </div>
              <div>
                <dt>Bearbeiter</dt>
                <dd>{bearbeiter}</dd>
              </div>
            </dl>
            <div className="arbeitsauftragSummaryMedia">
              {machine.image ? (
                <img
                  className="machineImagePreview"
                  src={machine.image}
                  alt="Maschinenbild"
                />
              ) : null}
              {machine.qr_code ? (
                <img
                  className="machineQrImage arbeitsauftragSummaryQrImage"
                  src={machine.qr_code}
                  alt="QR"
                />
              ) : null}
            </div>
          </div>
        </div>
      </header>

      <section className="protocolSection card aaBlock aaBlockStammdaten">
        <h2 className="spacedTitle">Stammdaten</h2>
        <dl className="aaGeraetDl arbeitsauftragStammdatenList">
          {visibleStammdaten.map((field) => (
            <div key={field.label}>
              <dt>{field.label}</dt>
              <dd>{field.value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="protocolSection card aaBlock aaBlockProtokoll">
        <h2 className="spacedTitle">Arbeitsauftrag Protokoll</h2>
        <table className="machineTable aaProtokollScheduleTable aaProtokollScheduleTablePrint">
          <thead>
            <tr>
              <th>Service Material</th>
              <th className="aaProtokollColJura">Jura HiFi</th>
              <th className="aaProtokollColSf">SF-Filter</th>
              <th className="aaProtokollColStock">Lagerstand</th>
              <th className="aaProtokollColMenge">Menge</th>
            </tr>
          </thead>
          <tbody>
            {order.protocol.serviceSchedule.map((row) => (
              <tr key={row.id}>
                <td>{row.serviceMaterial.trim() || "—"}</td>
                <td className="aaProtokollColJura">
                  <span className="aaProtokollValueJura">
                    {row.juraHifi.trim() || "—"}
                  </span>
                </td>
                <td className="aaProtokollColSf">
                  <span className="aaProtokollValueSf">
                    {row.sfFilter.trim() || "—"}
                  </span>
                </td>
                <td className="aaProtokollColStock">
                  {row.lagerTeilId
                    ? formatLagerNumber(row.lagerstandSnapshot ?? 0)
                    : "—"}
                </td>
                <td className="aaProtokollColMenge">
                  {row.menge > 0 ? formatLagerNumber(row.menge) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <h3 className="aaProtokollRepairTitle">Reparaturdaten</h3>
        <div className="aaProtokollRepairGrid aaProtokollRepairGridPrint">
          {order.protocol.repairGroups.map((group) => (
            <div key={group.id} className="aaProtokollRepairCol">
              <h4>{group.title}</h4>
              <ul className="aaProtokollCheckList">
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className={`aaProtokollCheckItem tone-${item.tone ?? "default"}${
                      item.checked ? " isChecked" : ""
                    }`}
                  >
                    <span className="aaProtokollCheckBox">
                      {item.checked ? "☑" : "☐"}
                    </span>
                    <span>{item.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {checkedRepairLabels.length > 0 || hasValue(order.notes) ? (
        <section className="protocolSection card aaBlock">
          <h2 className="spacedTitle">Bemerkung:</h2>
          {checkedRepairLabels.length > 0 ? (
            <ul className="aaBemerkungCheckSummaryList aaBemerkungCheckSummaryListPrint">
              {checkedRepairLabels.map((label) => (
                <li key={label}>{label}</li>
              ))}
            </ul>
          ) : null}
          {hasValue(order.notes) ? (
            <p className="arbeitsauftragPrintNotes">{order.notes}</p>
          ) : null}
        </section>
      ) : null}

      <footer className="arbeitsauftragPrintFooter aaFooter">
        <span>BOCSA · Arbeitsauftrag</span>
        <span>
          {formatValue(machine.geraetenummer)} · {formatOrderType(order.type)} · {order.date}
        </span>
      </footer>
    </div>
  );
}
