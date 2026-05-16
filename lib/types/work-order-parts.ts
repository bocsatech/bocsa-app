/** Ersatzteil / Service-Material Zeile im Arbeitsauftrag */
export type WorkOrderServicePart = {
  id: string;
  serviceMaterial: string;
  juraHifi: string;
  sfFilter: string;
  /** Optional: Verknüpfung mit Lager */
  lagerTeilId?: string | null;
  menge?: number;
};
