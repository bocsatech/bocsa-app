export type Kunde = {
  id: string;
  created_at: string;
  updated_at: string;
  kundennummer: string | null;
  anrede: string | null;
  titel: string | null;
  vorname: string | null;
  nachname: string;
  firma: string | null;
  email: string | null;
  telefon: string | null;
  mobil: string | null;
  strasse: string | null;
  plz: string | null;
  ort: string | null;
  land: string | null;
  uid_nr: string | null;
  notizen: string | null;
  aktiv: boolean;
  /** Nur API-Response bei Anlage/Änderung */
  portal_pin_set?: boolean;
};

export type PkwFahrzeug = {
  id: string;
  created_at: string;
  updated_at: string;
  kunde_id: string | null;
  kennzeichen: string;
  marke: string | null;
  modell: string | null;
  fin: string | null;
  baujahr: string | null;
  farbe: string | null;
  kraftstoff: string | null;
  leistung_kw: number | null;
  km_stand: number | null;
  km_stand_at: string | null;
  notizen: string | null;
  qr_token: string;
  aktiv: boolean;
  kunde?: Kunde | null;
};

export type PkwServizPlatz = {
  nummer: number;
  bezeichnung: string;
  aktiv: boolean;
};

export type PkwServiceArt = {
  key: string;
  label: string;
  sort_order: number;
  aktiv: boolean;
};

export type PkwBuchungStatus =
  | "angefragt"
  | "bestaetigt"
  | "in_arbeit"
  | "fertig"
  | "abgesagt";

export type PkwBuchung = {
  id: string;
  created_at: string;
  updated_at: string;
  kunde_id: string | null;
  fahrzeug_id: string | null;
  kennzeichen: string;
  km_stand: number | null;
  servicearten: string[];
  problem_text: string | null;
  slot_start: string;
  slot_end: string;
  platz_nummer: number | null;
  status: PkwBuchungStatus;
  assigned_user_id: string | null;
  source: "portal" | "buero";
  internal_notes: string | null;
  fahrzeug?: PkwFahrzeug | null;
  kunde?: Kunde | null;
};

export type PkwSlotOption = {
  start: string;
  end: string;
  label: string;
  freePlaetze: number;
  available: boolean;
};
