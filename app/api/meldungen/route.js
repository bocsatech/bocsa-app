import { NextResponse } from "next/server";
import { currentUserHasPermission, currentUserIsInGroup } from "../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

const MACHINE_TABLE = "maschines";

export async function GET() {
  if (!(await currentUserHasPermission("machines.read"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: machines.read erforderlich." },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { data, error } = await db
    .from(MACHINE_TABLE)
    .select("id, geraetenummer, bezeichnung, machine_tab_data")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const meldungen = (data ?? []).flatMap((machine) => {
    const tabData =
      machine.machine_tab_data && typeof machine.machine_tab_data === "object"
        ? machine.machine_tab_data
        : {};
    const reports = Array.isArray(tabData.meldungen) ? tabData.meldungen : [];

    return reports.map((report) => ({
      ...report,
      machineId: machine.id,
      geraetenummer: machine.geraetenummer,
      bezeichnung: machine.bezeichnung,
    }));
  });

  meldungen.sort((a, b) => String(b.createdAt ?? "").localeCompare(String(a.createdAt ?? "")));

  return NextResponse.json(meldungen, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

export async function DELETE(request) {
  if (!(await currentUserIsInGroup("Admin"))) {
    return NextResponse.json(
      { error: "Nur Admin-Benutzer dürfen Meldungen löschen." },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const machineId = typeof body.machineId === "string" ? body.machineId : "";
  const meldungId = typeof body.meldungId === "string" ? body.meldungId : "";

  if (!machineId || !meldungId) {
    return NextResponse.json({ error: "machineId und meldungId sind erforderlich." }, { status: 400 });
  }

  const { data: machine, error: loadError } = await db
    .from(MACHINE_TABLE)
    .select("id, machine_tab_data")
    .eq("id", machineId)
    .single();

  if (loadError || !machine) {
    return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });
  }

  const tabData =
    machine.machine_tab_data && typeof machine.machine_tab_data === "object"
      ? machine.machine_tab_data
      : {};
  const reports = Array.isArray(tabData.meldungen) ? tabData.meldungen : [];
  const nextReports = reports.filter((report) => report?.id !== meldungId);

  const { error } = await db
    .from(MACHINE_TABLE)
    .update({
      machine_tab_data: {
        ...tabData,
        meldungen: nextReports,
      },
    })
    .eq("id", machineId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
