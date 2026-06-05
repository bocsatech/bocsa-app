import { NextResponse } from "next/server";
import {
  canAccessLagerInventurSession,
  normalizeInventurSessionPayload,
} from "../../../../../lib/lager-inventur-session-server.mjs";
import { getCurrentSession } from "../../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

const TABLE = "lager_teile";
const SETUP_HINT =
  "Spalte inventur_entwurf fehlt. SQL: supabase/lager-inventur-entwurf.sql";

function isInventurEntwurfColumnMissingError(message) {
  const text = String(message ?? "").toLowerCase();
  return text.includes("inventur_entwurf");
}

function mapEntwurfRow(row) {
  if (!row?.id || row.inventur_entwurf == null) return null;
  return {
    teilId: String(row.id),
    entwurf: Number(row.inventur_entwurf),
    entwurfAt: row.inventur_entwurf_at,
    entwurfBy: row.inventur_entwurf_by ?? null,
  };
}

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!(await canAccessLagerInventurSession())) {
    return NextResponse.json(
      {
        error:
          "Keine Berechtigung: warehouse.read, warehouse.issue oder machines.write erforderlich.",
      },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { data, error } = await db
    .from(TABLE)
    .select("id, inventur_entwurf, inventur_entwurf_at, inventur_entwurf_by")
    .not("inventur_entwurf", "is", null)
    .order("inventur_entwurf_at", { ascending: false });

  if (error) {
    if (isInventurEntwurfColumnMissingError(error.message)) {
      return NextResponse.json({
        entwuerfe: [],
        setupRequired: true,
        setupHint: SETUP_HINT,
      });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    entwuerfe: (data ?? []).map(mapEntwurfRow).filter(Boolean),
  });
}

export async function POST(request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!(await canAccessLagerInventurSession())) {
    return NextResponse.json(
      {
        error:
          "Keine Berechtigung: warehouse.read, warehouse.issue oder machines.write erforderlich.",
      },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const normalized = normalizeInventurSessionPayload(body);
  if (normalized.error) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const nowIso = new Date().toISOString();
  const username = session.username ?? "unbekannt";
  const entries = normalized.payload.order.map((teilId) => ({
    id: teilId,
    inventur_entwurf: Number(normalized.payload.counts[teilId]),
    inventur_entwurf_at: nowIso,
    inventur_entwurf_by: username,
  }));

  for (const entry of entries) {
    const { error } = await db
      .from(TABLE)
      .update({
        inventur_entwurf: entry.inventur_entwurf,
        inventur_entwurf_at: entry.inventur_entwurf_at,
        inventur_entwurf_by: entry.inventur_entwurf_by,
      })
      .eq("id", entry.id);

    if (error) {
      if (isInventurEntwurfColumnMissingError(error.message)) {
        return NextResponse.json(
          { error: SETUP_HINT, setupRequired: true },
          { status: 503 }
        );
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ teilCount: entries.length });
}
