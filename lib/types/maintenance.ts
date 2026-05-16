/** Verknüpfung Maschine ↔ Lager (Wartungstabelle, nur Referenz). */
export type MaintenanceLagerLink = {
  lagerTeilId: string;
  herstellernummer: string;
  bezeichnung?: string | null;
  lagerplatz?: string | null;
};

export type MaintenanceTabData = {
  parts?: MaintenanceLagerLink[];
};
