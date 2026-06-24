import { NextResponse } from "next/server";
import { getCurrentSession, currentUserHasPermission } from "../../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import {
  intern8_11ValidUntilFromPruefdatum,
  normalizePruefprotokoll,
} from "../../../../../lib/pruefprotokoll";

const MACHINE_TABLE = "maschines";

function normalizeMachine(row) {
  if (!row) return null;
  return {
    ...row,
    serial_number: row.serial_nummer ?? row.serial_number,
    machine_tab_data: row.machine_tab_data ?? {},
  };
}

export async function GET(_request, { params }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { id } = await params;
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { data, error } = await db.from(MACHINE_TABLE).select("*").eq("id", id).single();
  if (error || !data) {
    return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });
  }

  const list = data.machine_tab_data?.pruefprotokolle;
  return NextResponse.json(Array.isArray(list) ? list : []);
}

export async function POST(request, { params }) {
  if (!(await currentUserHasPermission("machines.write"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: machines.write erforderlich." },
      { status: 403 }
    );
  }

  const session = await getCurrentSession();
  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { data: row, error: loadError } = await db
    .from(MACHINE_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (loadError || !row) {
    return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });
  }

  const machine = normalizeMachine(row);
  const tabData =
    machine.machine_tab_data && typeof machine.machine_tab_data === "object"
      ? { ...machine.machine_tab_data }
      : {};

  const existing = Array.isArray(tabData.pruefprotokolle) ? tabData.pruefprotokolle : [];
  const stamp = new Date().toISOString();
  const protokoll = normalizePruefprotokoll(
    {
      ...body,
      updatedAt: stamp,
      updatedBy: session?.username ?? body.updatedBy,
      createdAt: body.createdAt ?? stamp,
      createdBy: body.createdBy ?? session?.username,
    },
    machine
  );

  const index = existing.findIndex((item) => item?.id === protokoll.id);
  const pruefprotokolle =
    index >= 0
      ? existing.map((item, i) => (i === index ? protokoll : item))
      : [protokoll, ...existing];

  const intern811ValidUntil = intern8_11ValidUntilFromPruefdatum(
    protokoll.pruefdatum || protokoll.geraetedaten?.pruefdatum
  );

  const updatePayload = {
    machine_tab_data: { ...tabData, pruefprotokolle },
  };
  if (intern811ValidUntil) {
    updatePayload.intern_8_11_gultig_bis = intern811ValidUntil;
  }

  const { data: updated, error: saveError } = await db
    .from(MACHINE_TABLE)
    .update(updatePayload)
    .eq("id", id)
    .select("*")
    .single();

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json(normalizeMachine(updated));
}
