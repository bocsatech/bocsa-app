drop table if exists public.machines cascade;

create table public.machines (
  id uuid primary key default gen_random_uuid(),

  maschine_nummer text,
  maschine_type text,
  serialnummer text,
  baujahr text,
  geraet_type text,
  filiale text,

  stundenzaehlerstand text,

  elektro_ove_gueltig_bis date,
  intern_8_11_gueltig_bis date,
  paragraf_57_gueltig_bis date,

  kennzeichen text,
  std_zaehler_getauscht_am date,
  stundenzaehler_alt text,

  letztes_service_am date,
  frostschutz_geprueft_am date,
  schadensmeldung_status text,

  bild_qr_code text,
  bild text,

  motor_type text,
  motornummer text,
  motorleistung text,
  ventilspiel_einlass text,
  ventilspiel_auslass text,
  motoroeldruck text,
  diesel_partikelfilter text,
  ad_blue text,
  euro_abgasnorm text,
  motor_ersatzteilkatalog text,

  eigengewicht text,
  gesamtbreite text,
  gesamthoehe text,
  gesamtlaenge text,
  schaufelnutzlast text,
  reifendimension text,
  reifendruck text,
  kettendimension text,
  batterieleistung text,

  luftfilter_aussen text,
  luftfilter_innen text,
  motoroelfilter text,
  dieselfilter text,
  benzin_filter text,
  hydraulikoel_filter text,

  motoroel text,
  getriebeoel text,
  kompressoroel text,
  hydraulikoel text,
  achsenoel text,
  differentialoel text,
  kuehlfluessigkeit text,
  bremsfluessigkeit text,

  betriebsanleitung text,
  ersatzteilkatalog text,
  stromlaufplan text,
  hydraulikplan text,

  drehlicht text,
  fettpresse text,
  klimaanlage text,
  qr_code text,
  pruefprotokoll text,

  created_at timestamptz default now()
);
