import type { WorkOrder } from "./work-orders";
import { formatWorkOrderAuftragNr } from "./work-orders";
import type { RechnungPosition, RechnungSourceRef } from "./types/rechnung";
import { newPosition, renumberPositions } from "./rechnung";

const DEFAULT_LOHN_STUNDENSATZ = 85;

export function positionsFromPkwArbeitsauftrag(
  order: WorkOrder,
  fahrzeugId: string,
  startIndex = 0
): { positionen: RechnungPosition[]; sourceRef: RechnungSourceRef } {
  const rows: RechnungPosition[] = [];
  let sort = startIndex;
  const nrLabel = formatWorkOrderAuftragNr(order) || order.id;

  rows.push(
    newPosition({
      pos_typ: "titel",
      bezeichnung: `PKW-Arbeitsauftrag ${nrLabel} (${order.date || "—"})`,
      sort_order: sort++,
      source_type: "pkw_arbeitsauftrag",
      source_ref: { fahrzeugId, auftragId: order.id },
    })
  );

  if (order.repairDescription?.trim()) {
    const hours = Number.parseFloat(order.workHours?.replace(",", ".") || "0");
    const einzel = hours > 0 ? DEFAULT_LOHN_STUNDENSATZ : 0;
    const menge = hours > 0 ? hours : 1;
    rows.push(
      newPosition({
        pos_typ: "position",
        kostenart: "lohn",
        bezeichnung: order.repairDescription.trim(),
        menge,
        einheit: hours > 0 ? "Std" : "pau",
        einzelpreis_netto: einzel,
        sort_order: sort++,
        source_type: "pkw_arbeitsauftrag",
        source_ref: { fahrzeugId, auftragId: order.id, field: "repairDescription" },
      })
    );
  }

  for (const part of order.serviceParts ?? []) {
    const label = [part.serviceMaterial, part.juraHifi, part.sfFilter].filter(Boolean).join(" / ");
    if (!label.trim()) continue;
    rows.push(
      newPosition({
        pos_typ: "position",
        kostenart: "material",
        bezeichnung: label.trim(),
        menge: part.menge && part.menge > 0 ? part.menge : 1,
        einheit: "Stk",
        einzelpreis_netto: 0,
        sort_order: sort++,
        source_type: "pkw_arbeitsauftrag",
        source_ref: { fahrzeugId, auftragId: order.id, servicePartId: part.id },
        lager_teil_id: part.lagerTeilId ?? null,
      })
    );
  }

  return {
    positionen: renumberPositions(rows),
    sourceRef: { pkwFahrzeugId: fahrzeugId, pkwAuftragId: order.id },
  };
}

export function positionsFromBauArbeitsauftrag(
  order: WorkOrder,
  machineId: string,
  geraetLabel: string,
  startIndex = 0
): { positionen: RechnungPosition[]; sourceRef: RechnungSourceRef } {
  const rows: RechnungPosition[] = [];
  let sort = startIndex;
  const nrLabel = formatWorkOrderAuftragNr(order) || order.id;

  rows.push(
    newPosition({
      pos_typ: "titel",
      bezeichnung: `Bau-Arbeitsauftrag ${nrLabel} — ${geraetLabel}`,
      sort_order: sort++,
      source_type: "bau_arbeitsauftrag",
      source_ref: { machineId, auftragId: order.id },
    })
  );

  if (order.repairDescription?.trim()) {
    rows.push(
      newPosition({
        pos_typ: "position",
        kostenart: "lohn",
        bezeichnung: order.repairDescription.trim(),
        menge: 1,
        einheit: "pau",
        einzelpreis_netto: 0,
        sort_order: sort++,
        source_type: "bau_arbeitsauftrag",
        source_ref: { machineId, auftragId: order.id },
      })
    );
  }

  for (const part of order.serviceParts ?? []) {
    const label = [part.serviceMaterial, part.juraHifi, part.sfFilter].filter(Boolean).join(" / ");
    if (!label.trim()) continue;
    rows.push(
      newPosition({
        pos_typ: "position",
        kostenart: "material",
        bezeichnung: label.trim(),
        menge: part.menge && part.menge > 0 ? part.menge : 1,
        einheit: "Stk",
        einzelpreis_netto: 0,
        sort_order: sort++,
        source_type: "bau_arbeitsauftrag",
        source_ref: { machineId, auftragId: order.id, servicePartId: part.id },
        lager_teil_id: part.lagerTeilId ?? null,
      })
    );
  }

  return {
    positionen: renumberPositions(rows),
    sourceRef: { machineId, bauAuftragId: order.id },
  };
}

export function mergeImportedPositions(
  existing: RechnungPosition[],
  imported: RechnungPosition[]
) {
  return renumberPositions([...existing, ...imported]);
}
