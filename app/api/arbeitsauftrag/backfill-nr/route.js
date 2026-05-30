import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { buildAuftragNrPrefix } from "../../../../lib/auftrag-nr";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { SESSION_COOKIE } from "../../../../lib/auth/constants";
import { verifySessionToken } from "../../../../lib/auth/session";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";

const MACHINE_TABLE = "maschines";

async function requireWrite() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = verifySessionToken(token);
  if (!session) {
    return { error: NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 }) };
  }
  const allowed = await currentUserHasPermission("machines.write");
  if (!allowed) {
    return {
      error: NextResponse.json(
        { error: "Keine Berechtigung: machines.write erforderlich." },
        { status: 403 }
      ),
    };
  }
  return { session };
}

function getWorkOrdersFromTabData(tabData) {
  if (!tabData || typeof tabData !== "object") return [];
  const orders = tabData.work_orders;
  return Array.isArray(orders) ? orders : [];
}

async function reserveNr(supabase, type, depot, date) {
  const prefix = buildAuftragNrPrefix(type, depot, date || undefined);
  const { data, error } = await supabase.rpc("next_arbeitsauftrag_nr", {
    p_prefix: prefix,
  });
  if (error) throw error;
  return typeof data === "string" ? data : String(data ?? "");
}

export async function POST(request) {
  const auth = await requireWrite();
  if (auth.error) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const machineId = String(body?.machineId ?? "").trim();
  if (!machineId) {
    return NextResponse.json({ error: "machineId fehlt." }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data: row, error: loadError } = await supabase
    .from(MACHINE_TABLE)
    .select("id, depot, machine_tab_data")
    .eq("id", machineId)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!row) {
    return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });
  }

  const tabData =
    row.machine_tab_data && typeof row.machine_tab_data === "object"
      ? { ...row.machine_tab_data }
      : {};

  const orders = getWorkOrdersFromTabData(tabData);
  if (orders.length === 0) {
    return NextResponse.json({ assigned: 0, total: 0 });
  }

  const machineDepot = String(row.depot ?? "").trim();
  let assigned = 0;
  const nextOrders = [];

  for (const raw of orders) {
    if (!raw || typeof raw !== "object" || typeof raw.id !== "string") continue;
    const existingNr = String(raw.auftragNr ?? "").trim();
    if (existingNr) {
      nextOrders.push(raw);
      continue;
    }

    const type = String(raw.type ?? "Service").trim() || "Service";
    const depot = String(raw.depot ?? machineDepot).trim() || machineDepot;
    const date = String(raw.date ?? "").trim();

    try {
      const auftragNr = await reserveNr(supabase, type, depot, date);
      nextOrders.push({ ...raw, auftragNr });
      assigned += 1;
    } catch (error) {
      const message = String(error?.message ?? "");
      if (
        message.includes("next_arbeitsauftrag_nr") ||
        message.includes("arbeitsauftrag_nr_counters")
      ) {
        return NextResponse.json(
          {
            error:
              "Auftrag-Nr.-Tabelle fehlt. Bitte supabase/arbeitsauftrag-nr.sql in Supabase ausführen.",
          },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: message || "Auftrag-Nr. konnte nicht zugewiesen werden." },
        { status: 500 }
      );
    }
  }

  if (assigned === 0) {
    return NextResponse.json({ assigned: 0, total: orders.length });
  }

  const { error: saveError } = await supabase
    .from(MACHINE_TABLE)
    .update({
      machine_tab_data: { ...tabData, work_orders: nextOrders },
    })
    .eq("id", machineId);

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json({ assigned, total: orders.length });
}
