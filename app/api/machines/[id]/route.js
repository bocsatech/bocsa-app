import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { SESSION_COOKIE } from "../../../../lib/auth/constants";
import { verifySessionToken } from "../../../../lib/auth/session";
import { stripWorkOrdersFromTabData } from "../../../../lib/machine-tab-data";

const MACHINE_COLUMNS = "*";
const MACHINE_TABLE = "maschines";

const EDITABLE_FIELDS = [
  "status",
  "prufung",
  "geraetenummer",
  "bezeichnung",
  "serial_number",
  "image",
  "qr_code",
  "subgroup",
  "baujahr",
  "geraettyp",
  "km_stand",
  "arbeitsstunden",
  "tpg_hebetechnik",
  "elektro_ove",
  "depot",
  "hour_meter_reading",
  "intern_8_11",
  "section_57a",
  "license_plate",
  "hour_meter_changed_at",
  "old_hour_meter_reading",
  "last_service_date",
  "last_service_by",
  "antifreeze_checked_at",
  "damage_status",
  "description",
  "engine_type",
  "engine_number",
  "engine_power_kw",
  "emission_standard",
  "net_weight",
  "total_width",
  "total_height",
  "total_length",
  "engine_oil_type",
  "engine_oil_capacity",
  "hydraulic_oil_type",
  "hydraulic_oil_capacity",
  "machine_tab_data",
];

const FIELD_TO_DB_COLUMN = {
  serial_number: "serial_nummer",
  image: "kep",
  hour_meter_reading: "stundenzahlerstand",
  tpg_hebetechnik: "tpg_heben_technik_7_8_gultig_bis",
  elektro_ove: "elektro_ove_e8701_e8001_gultig_bis",
  intern_8_11: "intern_8_11_gultig_bis",
  section_57a: "paragraf_57a_gultig_bis",
  license_plate: "kennzeichen",
  hour_meter_changed_at: "std_zahler_getauscht_am",
  old_hour_meter_reading: "stundenzahlerstand_alt",
  last_service_date: "letztes_service_am",
  last_service_by: "letztes_service_von",
  antifreeze_checked_at: "frostschutz_gepruft_am",
  damage_status: "schadensmeldung_status",
  description: "beschreibung",
};

const TABDATA_VIRTUAL_FIELDS = ["geraettyp", "km_stand"];

function normalizeMachine(row) {
  if (!row) return row;

  const tabData = stripWorkOrdersFromTabData(row.machine_tab_data);
  const meldungCount = Array.isArray(tabData?.meldungen) ? tabData.meldungen.length : 0;

  return {
    ...row,
    machine_tab_data: tabData,
    status:
      row.status ??
      row.machine_tab_data?.status ??
      row.schadensmeldung_status ??
      null,
    prufung:
      row.prufung ??
      row.machine_tab_data?.prufung ??
      row.tpg_heben_technik_7_8_gultig_bis ??
      null,
    geraetenummer:
      row.geraetenummer ??
      row.machine_tab_data?.geraetenummer ??
      null,
    bezeichnung:
      row.bezeichnung ??
      row.machine_tab_data?.bezeichnung ??
      row.beschreibung ??
      null,
    serial_number: row.serial_nummer ?? null,
    image: row.kep ?? row.image ?? null,
    qr_code: row.qr_code ?? null,
    hour_meter_reading: row.stundenzahlerstand ?? row.hour_meter_reading ?? null,
    tpg_hebetechnik:
      row.tpg_heben_technik_7_8_gultig_bis ?? null,
    elektro_ove:
      row.elektro_ove_e8701_e8001_gultig_bis ?? null,
    intern_8_11: row.intern_8_11_gultig_bis ?? null,
    section_57a: row.paragraf_57a_gultig_bis ?? null,
    license_plate: row.kennzeichen ?? null,
    hour_meter_changed_at:
      row.std_zahler_getauscht_am ?? null,
    old_hour_meter_reading:
      row.stundenzahlerstand_alt ?? null,
    geraettyp: row.geraettyp ?? tabData?.geraettyp ?? null,
    km_stand: row.km_stand ?? tabData?.km_stand ?? null,
    arbeitsstunden: row.arbeitsstunden ?? tabData?.arbeitsstunden ?? null,
    meldung_status: meldungCount > 0 ? "Meldung vorhanden" : "Keine Meldung",
    last_service_date: row.letztes_service_am ?? null,
    last_service_by: row.letztes_service_von ?? null,
    antifreeze_checked_at:
      row.frostschutz_gepruft_am ?? null,
    damage_status: row.schadensmeldung_status ?? row.status ?? null,
    description: row.beschreibung ?? null,
  };
}

function normalizePublicMachine(row) {
  if (!row) return row;

  const documentation =
    row.machine_tab_data?.documentation && typeof row.machine_tab_data.documentation === "object"
      ? row.machine_tab_data.documentation
      : {};

  return {
    id: row.id,
    geraetenummer: row.geraetenummer ?? row.machine_tab_data?.geraetenummer ?? null,
    bezeichnung: row.bezeichnung ?? row.machine_tab_data?.bezeichnung ?? row.beschreibung ?? null,
    image: row.kep ?? row.image ?? null,
    status: row.status ?? row.schadensmeldung_status ?? null,
    damage_status: row.schadensmeldung_status ?? row.status ?? null,
    schadensmeldung_status: row.schadensmeldung_status ?? null,
    intern_8_11: row.intern_8_11_gultig_bis ?? null,
    intern_8_11_gultig_bis: row.intern_8_11_gultig_bis ?? null,
    last_service_date: row.letztes_service_am ?? null,
    letztes_service_am: row.letztes_service_am ?? null,
    prufung: row.prufung ?? row.tpg_heben_technik_7_8_gultig_bis ?? null,
    tpg_hebetechnik: row.tpg_heben_technik_7_8_gultig_bis ?? null,
    arbeitsstunden: row.arbeitsstunden ?? row.machine_tab_data?.arbeitsstunden ?? null,
    machine_tab_data: {
      pruefprotokoll_url:
        row.machine_tab_data?.pruefprotokoll_url ??
        row.machine_tab_data?.pruefprotokoll ??
        documentation.pruefprotokoll ??
        row.machine_tab_data?.pruefbericht_url ??
        null,
      betriebsanleitung_url:
        row.machine_tab_data?.betriebsanleitung_url ??
        row.machine_tab_data?.betriebsanleitung ??
        documentation.operatingManual ??
        null,
      documentation: {
        pruefprotokoll: documentation.pruefprotokoll ?? null,
        operatingManual: documentation.operatingManual ?? null,
      },
    },
  };
}

function buildMachinePatch(body) {
  const patch = {};
  const virtualTabData = {};

  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      const value = body[field];
      const normalizedValue =
        field === "machine_tab_data" && value && typeof value === "object"
          ? stripWorkOrdersFromTabData(value)
          : typeof value === "string"
            ? value.trim() || null
            : value;
      if (TABDATA_VIRTUAL_FIELDS.includes(field)) {
        virtualTabData[field] = normalizedValue;
      } else {
        patch[FIELD_TO_DB_COLUMN[field] ?? field] = normalizedValue;
      }
    }
  }

  if (Object.keys(virtualTabData).length > 0) {
    const currentTabData =
      patch.machine_tab_data && typeof patch.machine_tab_data === "object"
        ? patch.machine_tab_data
        : {};
    patch.machine_tab_data = stripWorkOrdersFromTabData({
      ...currentTabData,
      ...virtualTabData,
    });
  }

  if (patch.schadensmeldung_status !== undefined) {
    patch.status = patch.schadensmeldung_status;
  }

  return patch;
}

export async function GET(_request, { params }) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Hiányzik a Supabase konfiguráció (.env.local: URL és ANON_KEY).",
      },
      { status: 500 }
    );
  }

  const { id } = await params;
  const { data, error } = await supabase
    .from(MACHINE_TABLE)
    .select(MACHINE_COLUMNS)
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  return NextResponse.json(session ? normalizeMachine(data) : normalizePublicMachine(data), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function PATCH(request, { params }) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Hiányzik a Supabase konfiguráció (.env.local: URL és ANON_KEY).",
      },
      { status: 500 }
    );
  }

  if (!(await currentUserHasPermission("machines.write"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: machines.write erforderlich." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await request.json();

  const patch = buildMachinePatch(body);

  const { data, error } = await supabase
    .from(MACHINE_TABLE)
    .update(patch)
    .eq("id", id)
    .select(MACHINE_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(normalizeMachine(data), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
