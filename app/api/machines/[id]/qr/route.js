import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../../lib/auth/permissions";
import { generateMachineQrCode } from "../../../../../lib/qr-code.mjs";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const MACHINE_TABLE = "maschines";
const MACHINE_COLUMNS = "*";

function normalizeMachine(row) {
  if (!row) return row;
  return {
    ...row,
    geraetenummer: row.geraetenummer ?? null,
    qr_code: row.qr_code ?? null,
  };
}

export async function POST(request, { params }) {
  if (!(await currentUserHasPermission("machines.write"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: machines.write erforderlich." },
      { status: 403 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { id } = await params;
  const { data: machine, error: loadError } = await supabase
    .from(MACHINE_TABLE)
    .select(MACHINE_COLUMNS)
    .eq("id", id)
    .single();

  if (loadError || !machine) {
    return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });
  }

  try {
    const origin = request.headers.get("origin") ?? undefined;
    const { publicPath, targetUrl } = await generateMachineQrCode(machine, origin, {
      supabase,
    });

    const { data, error } = await supabase
      .from(MACHINE_TABLE)
      .update({ qr_code: publicPath })
      .eq("id", id)
      .select(MACHINE_COLUMNS)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ...normalizeMachine(data),
      qr_target_url: targetUrl,
    });
  } catch (qrError) {
    return NextResponse.json(
      { error: qrError instanceof Error ? qrError.message : "QR-Code konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}
