import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUserIsInGroup } from "../../../../lib/auth/permissions";
import { SESSION_COOKIE } from "../../../../lib/auth/constants";
import { verifySessionToken } from "../../../../lib/auth/session";
import { isStructuredGeraetenummer } from "../../../../lib/geraetenummer";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { preserveProtokollVorlageKeys } from "../../../../lib/machine-protokoll-vorlage.mjs";

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
      error: NextResponse.json(
        { error: "Nur Admin darf Legacy-Aufträge bereinigen." },
        { status: 403 }
      ),
    };
  }
  return { session };
}

/** Entfernt alle Arbeitsaufträge von Maschinen ohne strukturierte Gerätenummer. */
export async function POST() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 503 });
  }

  const { data: machines, error } = await supabase
    .from(MACHINE_TABLE)
    .select("id, geraetenummer, machine_tab_data");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let machinesCleared = 0;
  let ordersRemoved = 0;
  const errors = [];

  for (const machine of machines ?? []) {
    if (isStructuredGeraetenummer(machine.geraetenummer)) continue;

    const tabData =
      machine.machine_tab_data && typeof machine.machine_tab_data === "object"
        ? { ...machine.machine_tab_data }
        : {};
    const orders = Array.isArray(tabData.work_orders) ? tabData.work_orders : [];
    if (orders.length === 0) continue;

    ordersRemoved += orders.length;
    const nextTab = { ...tabData, work_orders: [] };
    preserveProtokollVorlageKeys(nextTab, tabData);

    const { error: updateError } = await supabase
      .from(MACHINE_TABLE)
      .update({ machine_tab_data: nextTab })
      .eq("id", machine.id);

    if (updateError) {
      errors.push({ machineId: machine.id, error: updateError.message });
      continue;
    }

    machinesCleared += 1;
  }

  return NextResponse.json({
    ok: true,
    machinesCleared,
    ordersRemoved,
    errors: errors.slice(0, 20),
  });
}
