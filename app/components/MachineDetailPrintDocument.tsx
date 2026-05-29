import MachineHeroMedia from "./MachineHeroMedia";
import {
  formatGeraetenummerDisplay,
  hasValue,
} from "../../lib/machines";
import type { StammdatenField } from "../../lib/machines";
import type { Machine } from "../../lib/types/machine";

type Props = {
  machine: Machine;
  fields: StammdatenField[];
  bezeichnung?: string;
};

function statusClassName(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "fertig") return "fertig";
  if (normalized === "in reperatur" || normalized === "in reparatur") return "repair";
  return "";
}

function fieldDisplayValue(field: StammdatenField, bezeichnung?: string) {
  if (field.dbKey === "geraetenummer") {
    const num = formatGeraetenummerDisplay(field.value);
    const parts = [num, bezeichnung?.trim()].filter((v) => hasValue(v));
    return parts.length > 0 ? parts.join(" — ") : "—";
  }
  return field.value?.trim() || "—";
}

function printSubtitle(
  fields: StammdatenField[],
  machine: Machine,
  bezeichnung?: string
) {
  const geraetenummerField = fields.find((f) => f.dbKey === "geraetenummer");
  if (geraetenummerField) {
    return fieldDisplayValue(geraetenummerField, bezeichnung);
  }
  const num = formatGeraetenummerDisplay(machine.geraetenummer);
  const parts = [num, bezeichnung?.trim()].filter((v) => hasValue(v));
  return parts.join(" — ");
}

export default function MachineDetailPrintDocument({
  machine,
  fields,
  bezeichnung,
}: Props) {
  const subtitle = printSubtitle(fields, machine, bezeichnung);

  return (
    <article className="machineDetailPrintSheet">
      <header className="machineDetailPrintHeader">
        <h1>Maschinen Daten</h1>
        {hasValue(subtitle) && subtitle !== "—" ? (
          <p className="machineDetailPrintSubtitle">{subtitle}</p>
        ) : null}
      </header>
      <div className="machineDetailPrintBody">
        <div className="machineDetailPrintFields">
          {fields.map((field) => {
            const value = fieldDisplayValue(field, bezeichnung);
            const isMeldung = field.dbKey === "meldung_status";
            const isStatus = field.dbKey === "damage_status";
            return (
              <div key={field.label} className="fieldRow">
                <span>{field.label}</span>
                <strong
                  className={
                    isMeldung
                      ? value.toLowerCase().includes("vorhanden")
                        ? "meldungStatusValue danger"
                        : "meldungStatusValue ok"
                      : isStatus
                        ? `geraetstatusValue ${statusClassName(value)}`
                        : "machineDetailPrintValue"
                  }
                >
                  {value}
                </strong>
              </div>
            );
          })}
        </div>
        <aside className="machineDetailPrintMedia" aria-label="Maschinenbild und QR-Code">
          <MachineHeroMedia
            machine={machine}
            className="machineDetailPrintHeroMedia"
          />
        </aside>
      </div>
    </article>
  );
}
