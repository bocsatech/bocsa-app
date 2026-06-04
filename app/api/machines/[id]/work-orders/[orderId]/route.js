import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUserIsInGroup } from "../../../../../lib/auth/permissions";
import { SESSION_COOKIE } from "../../../../../lib/auth/constants";
import { verifySessionToken } from "../../../../../lib/auth/session";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import { getWorkOrders, removeWorkOrder } from "../../../../../lib/work-orders";

const MACHINE_TABLE = "maschines";

async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);
  if (!session) {
    return { error: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 }) };
  }
  const allowed = await currentUserIsInGroup("Admin");
  if (!allowed) {
    return {
      error: NextResponse.json({ error: "Nur Admin darf Aufträge löschen." }, { status: 403 }),
    };
  }
  return { session };
}

export async function DELETE(_request, { params }) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id: machineId, orderId } = await params;
  if (!machineId || !orderId) {
    return NextResponse.json({ error: "Maschinen- oder Auftrag-ID fehlt." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 503 });
  }

  const { data: machine, error: loadError } = await supabase
    .from(MACHINE_TABLE)
    .select("*")
    .eq("id", machineId)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!machine) {
    return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });
  }

  const existing = getWorkOrders(machine);
  if (!existing.some((order) => order.id === orderId)) {
    return NextResponse.json({ error: "Auftrag nicht gefunden." }, { status: 404 });
  }

  const tabData = removeWorkOrder(machine, orderId);

  const { error: updateError } = await supabase
    .from(MACHINE_TABLE)
    .update({ machine_tab_data: tabData })
    .eq("id", machineId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deletedOrderId: orderId });
}
