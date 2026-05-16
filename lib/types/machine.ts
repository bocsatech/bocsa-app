export type Machine = {
  id: string;
  created_at: string;
  depot: string | null;
  baujahr: string | null;
  status?: string | null;
  prufung?: string | null;
  geraetenummer: string | null;
  bezeichnung?: string | null;
  tpg_hebetechnik: string | null;
  elektro_ove: string | null;
  serial_number: string | null;
  subgroup: string | null;
  qr_code?: string | null;
  image?: string | null;
  hour_meter_reading?: number | null;
  intern_8_11?: string | null;
  section_57a?: string | null;
  license_plate?: string | null;
  hour_meter_changed_at?: string | null;
  old_hour_meter_reading?: number | null;
  last_service_date?: string | null;
  last_service_by?: string | null;
  antifreeze_checked_at?: string | null;
  damage_status?: string | null;
  description?: string | null;
  engine_type?: string | null;
  engine_number?: string | null;
  engine_power_kw?: number | null;
  emission_standard?: string | null;
  net_weight?: number | null;
  total_width?: number | null;
  total_height?: number | null;
  total_length?: number | null;
  engine_oil_type?: string | null;
  engine_oil_capacity?: string | null;
  hydraulic_oil_type?: string | null;
  hydraulic_oil_capacity?: string | null;
  /** Virtuelles Stammdatenfeld (in machine_tab_data gespeichert) */
  geraettyp?: string | null;
  /** Virtuelles Stammdatenfeld (in machine_tab_data gespeichert) */
  km_stand?: string | null;
  /** Arbeitsstunden (optional DB-Spalte, fallback: machine_tab_data) */
  arbeitsstunden?: number | null;
  /** Meldungsstatus aus QR-Meldungen */
  meldung_status?: string | null;
  machine_tab_data?: Record<string, unknown> | null;
  /** Raw DB columns (API may include before normalize) */
  schadensmeldung_status?: string | null;
  intern_8_11_gultig_bis?: string | null;
  letztes_service_am?: string | null;
};
