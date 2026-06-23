import { NextResponse } from "next/server";
import { currentUserCanReadUrlaub, resolveUrlaubWriteUsername } from "../../../lib/auth/urlaub";
import { getCurrentSession } from "../../../lib/auth/permissions";
import {
  attachBlocksToUrlaubUsers,
  blocksToDbRows,
  dbRowsToBlocks,
  isMissingUrlaubTablesError,
} from "../../../lib/urlaub-db";
import { mapDbUsersToUrlaubTimelineUsers } from "../../../lib/urlaub-timeline-users";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const TABLE = "urlaub_tage";

function migrationHint() {
  return "Bitte supabase/urlaub-abwesenheiten.sql in Supabase ausführen.";
}

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  if (!(await currentUserCanReadUrlaub())) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { data, error } = await db.from(TABLE).select("username, datum, variant");
  if (error) {
    if (isMissingUrlaubTablesError(error)) {
      return NextResponse.json({ error: migrationHint(), rows: [] }, { status: 503 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    rows: data ?? [],
    username: session.username,
  });
}

export async function PUT(request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const username = await resolveUrlaubWriteUsername(body.username ?? session.username);
  if (!username) {
    return NextResponse.json({ error: "Keine Berechtigung." }, { status: 403 });
  }

  const blocks = Array.isArray(body.blocks) ? body.blocks : [];
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const rows = blocksToDbRows(username, blocks);

  const { error: deleteError } = await db.from(TABLE).delete().eq("username", username);
  if (deleteError) {
    if (isMissingUrlaubTablesError(deleteError)) {
      return NextResponse.json({ error: migrationHint() }, { status: 503 });
    }
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  if (rows.length > 0) {
    const { error: insertError } = await db.from(TABLE).upsert(rows, {
      onConflict: "username,datum",
    });
    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }
  }

  return NextResponse.json({
    ok: true,
    username,
    dayCount: rows.length,
    blocks: dbRowsToBlocks(rows),
  });
}
