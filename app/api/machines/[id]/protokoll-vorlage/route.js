import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import {
  currentUserHasPermission,
  currentUserIsInGroup,
} from "../../../../../lib/auth/permissions";
import {
  buildEigenVorlageTabPatch,
  clearEigenVorlageTabPatch,
  readEigenVorlageFromTabData,
} from "../../../../../lib/machine-protokoll-vorlage.mjs";

const MACHINE_TABLE = "maschines";

async function canPatchMachine() {
  if (await currentUserIsInGroup("Admin")) return true;
  if (await currentUserIsInGroup("Techniker")) return true;
  return currentUserHasPermission("machines.write");
}

export async function GET(_request, { params }) {
  if (!(await currentUserHasPermission("machines.read"))) {
    return NextResponse.json({ error: "Keine Berechtigung: machines.read" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { id } = await params;
  const { data, error } = await supabase
    .from(MACHINE_TABLE)
    .select("machine_tab_data")
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });

  const tab = data.machine_tab_data;
  const vorlage = readEigenVorlageFromTabData(tab);
  return NextResponse.json({
    aktiv: Boolean(tab?.protokoll_vorlage_eigen_aktiv),
    vorlage,
  });
}

export async function PUT(request, { params }) {
  if (!(await canPatchMachine())) {
    return NextResponse.json(
      { error: "Keine Berechtigung: machines.write erforderlich." },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  if (!body.protocol || typeof body.protocol !== "object") {
    return NextResponse.json({ error: "Protokoll-Daten fehlen." }, { status: 400 });
  }

  const { data: existing, error: loadError } = await supabase
    .from(MACHINE_TABLE)
    .select("machine_tab_data")
    .eq("id", id)
    .maybeSingle();

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });

  const machine_tab_data = buildEigenVorlageTabPatch(
    existing.machine_tab_data,
    body.protocol
  );

  const { data, error } = await supabase
    .from(MACHINE_TABLE)
    .update({ machine_tab_data })
    .eq("id", id)
    .select("machine_tab_data")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const vorlage = readEigenVorlageFromTabData(data.machine_tab_data);
  return NextResponse.json({
    ok: true,
    aktiv: true,
    vorlage,
  });
}

export async function DELETE(_request, { params }) {
  if (!(await canPatchMachine())) {
    return NextResponse.json(
      { error: "Keine Berechtigung: machines.write erforderlich." },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { id } = await params;

  const { data: existing, error: loadError } = await supabase
    .from(MACHINE_TABLE)
    .select("machine_tab_data")
    .eq("id", id)
    .maybeSingle();

  if (loadError) return NextResponse.json({ error: loadError.message }, { status: 500 });
  if (!existing) return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });

  const machine_tab_data = clearEigenVorlageTabPatch(existing.machine_tab_data);

  const { error } = await supabase
    .from(MACHINE_TABLE)
    .update({ machine_tab_data })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
