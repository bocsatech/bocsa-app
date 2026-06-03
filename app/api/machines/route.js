import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { currentUserHasPermission } from "../../../lib/auth/permissions";
import { isStructuredGeraetenummer } from "../../../lib/geraetenummer.ts";
import { persistMachineQrCode } from "../../../lib/machine-qr.mjs";
import {
  allocateGeraetenummer,
  loadGeraetenummerCodes,
} from "../../../lib/geraetenummer-db.mjs";
import {
  formatMachineRowDates,
  normalizeMachinePatchDates,
} from "../../../lib/normalize-machine-dates";
import {
  applyGruppenTabDefaultsForNewMachine,
  applySubgroupForNewMachine,
} from "../../../lib/machine-geraetegruppe.mjs";

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
  "depot",
  "baujahr",
  "geraettyp",
  "km_stand",
  "arbeitsstunden",
  "hour_meter_reading",
  "tpg_hebetechnik",
  "elektro_ove",
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
  const datedRow = formatMachineRowDates(row);
  const tabData =
    datedRow.machine_tab_data && typeof datedRow.machine_tab_data === "object"
      ? datedRow.machine_tab_data
      : {};
  const meldungCount = Array.isArray(tabData.meldungen) ? tabData.meldungen.length : 0;

  return {
    ...datedRow,
    status:
      datedRow.status ?? tabData.status ?? datedRow.schadensmeldung_status ?? null,
    prufung:
      datedRow.prufung ??
      tabData.prufung ??
      datedRow.tpg_heben_technik_7_8_gultig_bis ??
      null,
    geraetenummer: datedRow.geraetenummer ?? tabData.geraetenummer ?? null,
    bezeichnung:
      datedRow.bezeichnung ?? tabData.bezeichnung ?? datedRow.beschreibung ?? null,
    serial_number: datedRow.serial_nummer ?? null,
    image: datedRow.kep ?? datedRow.image ?? null,
    qr_code: datedRow.qr_code ?? null,
    hour_meter_reading:
      datedRow.stundenzahlerstand ?? datedRow.hour_meter_reading ?? null,
    tpg_hebetechnik: datedRow.tpg_heben_technik_7_8_gultig_bis ?? null,
    elektro_ove: datedRow.elektro_ove_e8701_e8001_gultig_bis ?? null,
    intern_8_11: datedRow.intern_8_11_gultig_bis ?? null,
    section_57a: datedRow.paragraf_57a_gultig_bis ?? null,
    license_plate: datedRow.kennzeichen ?? null,
    hour_meter_changed_at: datedRow.std_zahler_getauscht_am ?? null,
    old_hour_meter_reading: datedRow.stundenzahlerstand_alt ?? null,
    geraettyp: datedRow.geraettyp ?? tabData.geraettyp ?? null,
    km_stand: datedRow.km_stand ?? tabData.km_stand ?? null,
    arbeitsstunden: datedRow.arbeitsstunden ?? tabData.arbeitsstunden ?? null,
    meldung_status: meldungCount > 0 ? "Meldung vorhanden" : "Keine Meldung",
    last_service_date: datedRow.letztes_service_am ?? null,
    last_service_by: datedRow.letztes_service_von ?? null,
    antifreeze_checked_at: datedRow.frostschutz_gepruft_am ?? null,
    damage_status: datedRow.schadensmeldung_status ?? datedRow.status ?? null,
    description: datedRow.beschreibung ?? null,
  };
}

function buildMachinePatch(body) {
  const patch = {};
  const virtualTabData = {};

  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      const value = body[field];
      const normalizedValue =
        typeof value === "string" ? value.trim() || null : value;
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
    patch.machine_tab_data = {
      ...currentTabData,
      ...virtualTabData,
    };
  }

  if (patch.schadensmeldung_status !== undefined) {
    patch.status = patch.schadensmeldung_status;
  }

  return patch;
}

export async function GET() {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json(
      {
        error:
          "Supabase ist nicht konfiguriert. Prüfen Sie .env.local: NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_ANON_KEY",
      },
      { status: 500 }
    );
  }

  const { data, error } = await supabase
    .from(MACHINE_TABLE)
    .select(MACHINE_COLUMNS)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json((data ?? []).map(normalizeMachine), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function POST(request) {
  const supabase = getSupabaseAdmin();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  if (!(await currentUserHasPermission("machines.write"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: machines.write erforderlich." },
      { status: 403 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const rawPatch = buildMachinePatch(body);
  const { patch, error: dateError } = normalizeMachinePatchDates(rawPatch);
  if (dateError) {
    return NextResponse.json({ error: dateError }, { status: 400 });
  }

  const pick = body.geraetenummer_pick;
  if (pick && typeof pick === "object") {
    try {
      const codes = await loadGeraetenummerCodes(supabase);
      const allocated = await allocateGeraetenummer(supabase, pick, codes);
      patch.geraetenummer = allocated.geraetenummer;
      if (allocated.geraettyp) {
        const tabData =
          patch.machine_tab_data && typeof patch.machine_tab_data === "object"
            ? patch.machine_tab_data
            : {};
        patch.machine_tab_data = {
          ...tabData,
          geraettyp: allocated.geraettyp,
        };
      }
    } catch (allocationError) {
      return NextResponse.json(
        {
          error:
            allocationError instanceof Error
              ? allocationError.message
              : "Gerätenummer konnte nicht vergeben werden.",
        },
        { status: 400 }
      );
    }
  } else if (!patch.geraetenummer) {
    return NextResponse.json(
      { error: "Gerätenummer: Marke, Klasse und Gerätetyp müssen gewählt werden." },
      { status: 400 }
    );
  } else if (!isStructuredGeraetenummer(patch.geraetenummer)) {
    return NextResponse.json(
      {
        error:
          "Gerätenummer muss dem Format MARKE-KLASSE-ART-00001 entsprechen (z. B. WN-GG-ST1-00001).",
      },
      { status: 400 }
    );
  }

  applySubgroupForNewMachine(patch);
  await applyGruppenTabDefaultsForNewMachine(supabase, patch);

  const { data, error } = await supabase
    .from(MACHINE_TABLE)
    .insert(patch)
    .select(MACHINE_COLUMNS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let createdMachine = data;
  const origin = request.headers.get("origin") ?? undefined;

  try {
    await persistMachineQrCode(supabase, data, origin);
    const { data: updatedData, error: updateError } = await supabase
      .from(MACHINE_TABLE)
      .select(MACHINE_COLUMNS)
      .eq("id", data.id)
      .single();

    if (!updateError && updatedData) {
      createdMachine = updatedData;
    }
  } catch (qrError) {
    console.error("QR-Code konnte nicht generiert werden:", qrError);
    return NextResponse.json(
      {
        error:
          qrError instanceof Error ? qrError.message : "QR-Code konnte nicht erstellt werden.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json(normalizeMachine(createdMachine), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
