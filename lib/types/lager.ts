export type LagerTeil = {
  id: string;
  created_at: string;
  updated_at?: string;
  herstellernummer: string;
  bezeichnung?: string | null;
  bild?: string | null;
  produktgruppe?: string | null;
  lieferant?: string | null;
  lagerort?: string | null;
  lagerplatz?: string | null;
  lagerstand: number;
  listenpreis_netto?: number | null;
  listenpreis_brutto?: number | null;
  verkaufspreis?: number | null;
  bestellstatus?: string | null;
};
