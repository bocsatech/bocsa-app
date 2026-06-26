import { NextResponse } from "next/server";
import {
  currentUserHasPermission,
  getCurrentSession,
} from "../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";
import { loadFirmaSettings, saveFirmaSettings } from "../../../lib/firma-server.mjs";

export const runtime = "nodejs";

async function currentUserCanManageFirma() {
  const session = await getCurrentSession();
  if (!session) {
    return false;
  }

  if (session.username.trim().toLowerCase() === "admin") {
    return true;
  }

  return currentUserHasPermission("menu.branches");
}

export async function GET() {
  if (!(await currentUserCanManageFirma())) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { firma, updatedAt, error } = await loadFirmaSettings(db);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ firma, updatedAt });
}

export async function PUT(request) {
  if (!(await currentUserCanManageFirma())) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const { firma, error } = await saveFirmaSettings(db, body.firma ?? body);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ firma });
}
