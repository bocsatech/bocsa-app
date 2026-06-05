import { NextResponse } from "next/server";
import {
  getInventurSessionContext,
  INVENTUR_SESSION_TABLE,
  INVENTUR_SESSION_TTL_HOURS,
  isInventurSessionsTableMissingError,
  loadUserFilialeCode,
  mapInventurSessionRow,
  normalizeInventurSessionPayload,
} from "../../../../../lib/lager-inventur-session-server.mjs";
import {
  getSupabaseSqlEditorUrl,
  runLagerInventurSchemaSetup,
} from "../../../../../lib/lager-inventur-setup-server.mjs";

async function listPendingSessions(db) {
  const nowIso = new Date().toISOString();
  return db
    .from(INVENTUR_SESSION_TABLE)
    .select("*")
    .is("applied_at", null)
    .gt("expires_at", nowIso)
    .order("created_at", { ascending: false })
    .limit(20);
}

export const runtime = "nodejs";

export async function GET() {
  const ctx = await getInventurSessionContext();
  if (ctx.error) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  let { data, error } = await listPendingSessions(ctx.db);

  if (error && isInventurSessionsTableMissingError(error.message)) {
    const setup = await runLagerInventurSchemaSetup();
    if (setup.ok) {
      ({ data, error } = await listPendingSessions(ctx.db));
    } else {
      return NextResponse.json({
        sessions: [],
        setupRequired: true,
        setupHint:
          "Tabelle lager_inventur_sessions fehlt. SQL: supabase/lager-inventur-sessions.sql",
        sqlEditorUrl: setup.sqlEditorUrl ?? getSupabaseSqlEditorUrl(),
      });
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    sessions: (data ?? []).map(mapInventurSessionRow).filter(Boolean),
  });
}

export async function POST(request) {
  const ctx = await getInventurSessionContext();
  if (ctx.error) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const body = await request.json().catch(() => ({}));
  const normalized = normalizeInventurSessionPayload(body);
  if (normalized.error) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const expiresAt = new Date(Date.now() + INVENTUR_SESSION_TTL_HOURS * 60 * 60 * 1000);
  const filialeCode = await loadUserFilialeCode(ctx.session, ctx.db);

  const { data, error } = await ctx.db
    .from(INVENTUR_SESSION_TABLE)
    .insert({
      expires_at: expiresAt.toISOString(),
      created_by_user_id: ctx.session.userId,
      created_by_username: ctx.session.username,
      filiale_code: filialeCode,
      teil_count: normalized.payload.order.length,
      payload: normalized.payload,
    })
    .select("id")
    .single();

  if (error) {
    if (isInventurSessionsTableMissingError(error.message)) {
      const setup = await runLagerInventurSchemaSetup();
      if (setup.ok) {
        const retry = await ctx.db
          .from(INVENTUR_SESSION_TABLE)
          .insert({
            expires_at: expiresAt.toISOString(),
            created_by_user_id: ctx.session.userId,
            created_by_username: ctx.session.username,
            filiale_code: filialeCode,
            teil_count: normalized.payload.order.length,
            payload: normalized.payload,
          })
          .select("id")
          .single();
        if (!retry.error) {
          return NextResponse.json({ id: retry.data.id });
        }
      }
      return NextResponse.json(
        {
          error:
            "Inventur-Scan-Tabelle fehlt. Bitte supabase/lager-inventur-sessions.sql im Supabase SQL Editor ausführen.",
          setupRequired: true,
          sqlEditorUrl: setup.sqlEditorUrl ?? getSupabaseSqlEditorUrl(),
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ id: data.id });
}
