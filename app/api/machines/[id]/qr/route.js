import { NextResponse } from "next/server";
import { canManageMachineMedia } from "../../../../../lib/machine-permissions-server.mjs";
import { getMachineQrTargetUrl } from "../../../../../lib/qr-code.mjs";
import { persistMachineQrCode } from "../../../../../lib/machine-qr.mjs";
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
  if (!(await canManageMachineMedia())) {
    return NextResponse.json(
      { error: "Keine Berechtigung: machines.media erforderlich." },
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
    const bustUrl = await persistMachineQrCode(supabase, machine, origin);
    const targetUrl = getMachineQrTargetUrl(id, origin);

    const { data, error } = await supabase
      .from(MACHINE_TABLE)
      .select(MACHINE_COLUMNS)
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      ...normalizeMachine(data),
      qr_code: bustUrl,
      qr_target_url: targetUrl,
    });
  } catch (qrError) {
    return NextResponse.json(
      { error: qrError instanceof Error ? qrError.message : "QR-Code konnte nicht erstellt werden." },
      { status: 500 }
    );
  }
}
