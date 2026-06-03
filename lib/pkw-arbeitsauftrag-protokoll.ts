import {
  createDefaultProtocol,
  type WorkOrderProtocol,
} from "./arbeitsauftrag-protokoll";
import { maintenancePartsToScheduleRows } from "./geraetgruppe-protokoll";
import { getPkwErsatzteile } from "./pkw-ersatzteile";
import { fetchPkwGruppeVorlage } from "./pkw";
import type { PkwFahrzeug } from "./types/pkw";
import type { WorkOrderProtocolSource } from "./geraetgruppe-protokoll";

export async function fetchProtocolForNewPkwWorkOrder(
  fahrzeug: PkwFahrzeug
): Promise<{
  protocol: WorkOrderProtocol;
  source: WorkOrderProtocolSource;
  gruppe: string | null;
}> {
  const vehicleParts = getPkwErsatzteile(fahrzeug);
  if (vehicleParts.length > 0) {
    return {
      protocol: {
        ...createDefaultProtocol(),
        serviceSchedule: maintenancePartsToScheduleRows(vehicleParts),
      },
      source: "eigen",
      gruppe: fahrzeug.gruppe?.trim() || null,
    };
  }

  const gruppe = fahrzeug.gruppe?.trim();
  if (gruppe) {
    const { data } = await fetchPkwGruppeVorlage(gruppe);
    const parts = getPkwErsatzteile({ ersatzteile: data?.ersatzteile ?? [] } as PkwFahrzeug);
    if (parts.length > 0) {
      return {
        protocol: {
          ...createDefaultProtocol(),
          serviceSchedule: maintenancePartsToScheduleRows(parts),
        },
        source: "gruppe",
        gruppe,
      };
    }
  }

  return {
    protocol: createDefaultProtocol(),
    source: "standard",
    gruppe: gruppe || null,
  };
}
