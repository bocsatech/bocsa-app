import type { Kunde } from "./pkw";
import type { PkwFahrzeug } from "./pkw";

export type RechnungStatus = "entwurf" | "offen" | "bezahlt" | "storniert";

export type RechnungMwstModus = "zuzueglich" | "inklusive" | "ohne";

export type RechnungSourceType =
  | "manual"
  | "pkw_arbeitsauftrag"
  | "bau_arbeitsauftrag"
  | "lager"
  | "gemischt";

export type RechnungPosTyp = "position" | "titel" | "abzug";

export type RechnungKostenart = "material" | "lohn" | "durchlaufend" | "sonstige";

export type RechnungPositionSourceType =
  | "manual"
  | "lager_teil"
  | "pkw_arbeitsauftrag"
  | "bau_arbeitsauftrag";

export type KundeSnapshot = {
  kundennummer?: string | null;
  anrede?: string | null;
  titel?: string | null;
  vorname?: string | null;
  nachname?: string | null;
  firma?: string | null;
  email?: string | null;
  telefon?: string | null;
  strasse?: string | null;
  plz?: string | null;
  ort?: string | null;
  land?: string | null;
  uid_nr?: string | null;
};

export type FahrzeugSnapshot = {
  kennzeichen?: string | null;
  marke?: string | null;
  modell?: string | null;
  fin?: string | null;
  baujahr?: string | null;
  km_stand?: number | null;
  paragraf_57a_gultig_bis?: string | null;
};

export type RechnungSourceRef = {
  pkwFahrzeugId?: string;
  pkwAuftragId?: string;
  machineId?: string;
  bauAuftragId?: string;
  lagerTeilIds?: string[];
};

export type RechnungPosition = {
  id: string;
  rechnung_id?: string;
  position_nr: number;
  pos_typ: RechnungPosTyp;
  kostenart: RechnungKostenart | null;
  menge: number;
  einheit: string;
  bezeichnung: string;
  einzelpreis_netto: number;
  rabatt_prozent: number;
  positionspreis_netto: number;
  ust_satz: number;
  source_type: RechnungPositionSourceType | null;
  source_ref: Record<string, unknown> | null;
  lager_teil_id: string | null;
  sort_order: number;
};

export type Rechnung = {
  id: string;
  created_at: string;
  updated_at: string;
  rechnungs_nr: string;
  belegdatum: string;
  faelligkeitsdatum: string | null;
  status: RechnungStatus;
  kunde_id: string | null;
  kunde_snapshot: KundeSnapshot;
  pkw_fahrzeug_id: string | null;
  fahrzeug_snapshot: FahrzeugSnapshot | null;
  source_type: RechnungSourceType;
  source_ref: RechnungSourceRef | null;
  mwst_modus: RechnungMwstModus;
  leistungsdatum: string | null;
  bestellnr: string | null;
  lieferbedingung: string | null;
  notiz: string | null;
  zahlungshinweis: string | null;
  footer_hinweis: string | null;
  zwischensumme_netto: number;
  ust_19: number;
  ust_7: number;
  abzug: number;
  rechnungsbetrag: number;
  bearbeiter: string | null;
  created_by: string | null;
  updated_by: string | null;
  positionen?: RechnungPosition[];
};

export type RechnungListItem = Pick<
  Rechnung,
  | "id"
  | "rechnungs_nr"
  | "belegdatum"
  | "faelligkeitsdatum"
  | "status"
  | "kunde_snapshot"
  | "fahrzeug_snapshot"
  | "rechnungsbetrag"
  | "bearbeiter"
  | "updated_at"
>;

export type RechnungDraft = Omit<
  Rechnung,
  "id" | "created_at" | "updated_at" | "created_by" | "updated_by"
> & {
  positionen: RechnungPosition[];
};

export function kundeToSnapshot(kunde: Kunde | null | undefined): KundeSnapshot {
  if (!kunde) return {};
  return {
    kundennummer: kunde.kundennummer,
    anrede: kunde.anrede,
    titel: kunde.titel,
    vorname: kunde.vorname,
    nachname: kunde.nachname,
    firma: kunde.firma,
    email: kunde.email,
    telefon: kunde.telefon ?? kunde.mobil,
    strasse: kunde.strasse,
    plz: kunde.plz,
    ort: kunde.ort,
    land: kunde.land,
    uid_nr: kunde.uid_nr,
  };
}

export function fahrzeugToSnapshot(fahrzeug: PkwFahrzeug | null | undefined): FahrzeugSnapshot | null {
  if (!fahrzeug) return null;
  return {
    kennzeichen: fahrzeug.kennzeichen,
    marke: fahrzeug.marke,
    modell: fahrzeug.modell,
    fin: fahrzeug.fin,
    baujahr: fahrzeug.baujahr,
    km_stand: fahrzeug.km_stand,
    paragraf_57a_gultig_bis: fahrzeug.paragraf_57a_gultig_bis,
  };
}
