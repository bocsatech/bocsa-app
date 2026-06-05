import { NextResponse } from "next/server";
import {
  getInventurSessionContext,
  INVENTUR_SESSION_TABLE,
  mapInventurSessionRow,
} from "../../../../../../lib/lager-inventur-session-server.mjs";

export const runtime = "nodejs";

export async function GET(_request, { params }) {
  const ctx = await getInventurSessionContext();
  if (ctx.error) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const { id } = await params;
  const { data, error } = await ctx.db
    .from(INVENTUR_SESSION_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "Session nicht gefunden." }, { status: 404 });
  }

  return NextResponse.json({ session: mapInventurSessionRow(data) });
}

export async function PATCH(request, { params }) {
  const ctx = await getInventurSessionContext();
  if (ctx.error) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await request.json().catch(() => ({}));
  if (body.action !== "apply") {
    return NextResponse.json({ error: "Unbekannte Aktion." }, { status: 400 });
  }

  const { id } = await params;
  const nowIso = new Date().toISOString();

  const { data: existing, error: loadError } = await ctx.db
    .from(INVENTUR_SESSION_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (loadError) {
    return NextResponse.json({ error: loadError.message }, { status: 500 });
  }
  if (!existing) {
    return NextResponse.json({ error: "Session nicht gefunden." }, { status: 404 });
  }
  if (existing.applied_at) {
    return NextResponse.json({ session: mapInventurSessionRow(existing) });
  }
  if (existing.expires_at && existing.expires_at <= nowIso) {
    return NextResponse.json({ error: "Session abgelaufen." }, { status: 410 });
  }

  const { data, error } = await ctx.db
    .from(INVENTUR_SESSION_TABLE)
    .update({ applied_at: nowIso })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ session: mapInventurSessionRow(data) });
}
