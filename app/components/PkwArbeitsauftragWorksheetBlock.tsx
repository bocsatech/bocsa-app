"use client";

import { formatGermanDate } from "../../lib/dates";
import { formatKundeName } from "../../lib/pkw";
import {
  formatOrderType,
  formatWorkOrderAuftragNr,
  type WorkOrder,
} from "../../lib/work-orders";
import type { PkwFahrzeug } from "../../lib/types/pkw";

type Props = {
  fahrzeug: PkwFahrzeug;
  order: WorkOrder;
  username?: string;
  editable?: boolean;
  className?: string;
  onOrderChange?: (patch: Partial<WorkOrder>) => void;
};

export default function PkwArbeitsauftragWorksheetBlock({
  fahrzeug,
  order,
  username,
  editable = false,
  className = "",
  onOrderChange,
}: Props) {
  const bearbeiter = order.updatedBy || order.createdBy || username || "—";
  const auftragNr = formatWorkOrderAuftragNr(order);
  const kundeLabel = fahrzeug.kunde ? formatKundeName(fahrzeug.kunde) : "Firmenfahrzeug";

  return (
    <section className={`aaWorksheetMachine card aaMachineOverview aaBlock ${className}`.trim()}>
      <div className="aaWorksheetAuftragBand">
        <span className="aaWorksheetAuftragLabel">Arbeitsauftrag</span>
        <span className="aaWorksheetAuftragMeta">
          {formatOrderType(order.type)}
          {auftragNr && auftragNr !== "—" ? ` · ${auftragNr}` : ""}
          {order.date ? ` · ${order.date}` : ""}
          {order.time ? ` ${order.time}` : ""}
          {bearbeiter !== "—" ? ` · ${bearbeiter}` : ""}
        </span>
      </div>

      <div className="machineDataLayout">
        <div className="protocolGrid machineDataFields">
          <label className="fieldRow">
            <span>Kennzeichen</span>
            <span>{fahrzeug.kennzeichen}</span>
          </label>
          <label className="fieldRow">
            <span>PKW-Gruppe</span>
            <span>{fahrzeug.gruppe?.trim() || "—"}</span>
          </label>
          <label className="fieldRow">
            <span>Marke / Modell</span>
            <span>{[fahrzeug.marke, fahrzeug.modell].filter(Boolean).join(" ") || "—"}</span>
          </label>
          <label className="fieldRow">
            <span>Kunde</span>
            <span>{kundeLabel}</span>
          </label>
          <label className="fieldRow">
            <span>FIN</span>
            <span>{fahrzeug.fin?.trim() || "—"}</span>
          </label>
          <label className="fieldRow">
            <span>§57a gültig bis</span>
            <span>{formatGermanDate(fahrzeug.paragraf_57a_gultig_bis) || "—"}</span>
          </label>
          <label className="fieldRow">
            <span>Km-Stand (Fahrzeug)</span>
            {editable ? (
              <input
                value={order.hourMeterMachine ?? ""}
                onChange={(e) => onOrderChange?.({ hourMeterMachine: e.target.value })}
                placeholder={fahrzeug.km_stand != null ? String(fahrzeug.km_stand) : ""}
              />
            ) : (
              <span>{order.hourMeterMachine?.trim() || fahrzeug.km_stand?.toString() || "—"}</span>
            )}
          </label>
          <label className="fieldRow">
            <span>Km-Stand (Rücknahme)</span>
            {editable ? (
              <input
                value={order.hourMeterReturn ?? ""}
                onChange={(e) => onOrderChange?.({ hourMeterReturn: e.target.value })}
              />
            ) : (
              <span>{order.hourMeterReturn?.trim() || "—"}</span>
            )}
          </label>
        </div>

        <div className="machineHeroMedia machineDataMedia">
          <div className={`machineImageSlot ${fahrzeug.bild ? "hasMachineImage" : ""}`}>
            {fahrzeug.bild ? (
              <img className="machineImagePreview" src={fahrzeug.bild} alt={fahrzeug.kennzeichen} />
            ) : (
              <span>Fahrzeugbild</span>
            )}
          </div>
          {fahrzeug.qr_token ? (
            <div className="machineQrSlot hasQrImage machineQrLabeled">
              <img
                className="machineQrImage"
                src={`/api/pkw/fahrzeuge/${fahrzeug.id}/qr?ts=${fahrzeug.updated_at ?? ""}`}
                alt="QR-Code"
              />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
