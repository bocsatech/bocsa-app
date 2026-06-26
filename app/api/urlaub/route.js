import { NextResponse } from "next/server";
import { dateKeyFromDate } from "../../../lib/austria-holidays";
import { currentUserCanReadUrlaub, resolveUrlaubWriteUsername } from "../../../lib/auth/urlaub";
import { getCurrentSession } from "../../../lib/auth/permissions";
import { resolveUserAnnualUrlaubDays } from "../../../lib/urlaub-annual-days";
import { exceedsAnnualUrlaubQuota } from "../../../lib/urlaub-blocks";
import {
  ANNUAL_URLAUB_DAYS,
  formatUrlaubQuotaValue,
} from "../../../lib/urlaub-timeline-users";
import {
  attachBlocksToUrlaubUsers,
  blocksToDbRows,
  dbRowsToBlocks,
  isMissingUrlaubPortionColumn,
  isMissingUrlaubTablesError,
  stripPortionFromRows,
} from "../../../lib/urlaub-db";
import { mapDbUsersToUrlaubTimelineUsers } from "../../../lib/urlaub-timeline-users";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const TABLE = "urlaub_tage";
const SELECT_WITH_PORTION = "username, datum, variant, portion";
const SELECT_LEGACY = "username, datum, variant";

function migrationHint() {
  return "Bitte supabase/urlaub-abwesenheiten.sql in Supabase ausführen.";
}

function portionMigrationHint() {
  return "Bitte supabase/urlaub-half-day.sql in Supabase ausführen.";
}

async function loadAllRows(db) {
  let { data, error } = await db.from(TABLE).select(SELECT_WITH_PORTION);
  if (error && isMissingUrlaubPortionColumn(error)) {
    ({ data, error } = await db.from(TABLE).select(SELECT_LEGACY));
  }
  return { data, error };
}

async function loadAnnualUrlaubDaysForUsername(db, username) {
  const { data, error } = await db
    .from("users")
    .select("overtime_hours_balance")
    .eq("username", String(username).trim().toLowerCase())
    .maybeSingle();

  if (error || !data) return ANNUAL_URLAUB_DAYS;
  return resolveUserAnnualUrlaubDays(data.overtime_hours_balance, true);
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

  const { data, error } = await loadAllRows(db);
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

  const calendarYear = new Date().getFullYear();
  const todayKey = dateKeyFromDate(new Date());
  const annualUrlaubDays = await loadAnnualUrlaubDaysForUsername(db, username);
  if (exceedsAnnualUrlaubQuota(blocks, calendarYear, todayKey, annualUrlaubDays)) {
    return NextResponse.json(
      {
        error: `Maximal ${formatUrlaubQuotaValue(annualUrlaubDays)} Urlaubstage pro Jahr — Kontingent überschritten.`,
      },
      { status: 400 }
    );
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
    let { error: insertError } = await db.from(TABLE).upsert(rows, {
      onConflict: "username,datum",
    });
    if (insertError && isMissingUrlaubPortionColumn(insertError)) {
      ({ error: insertError } = await db.from(TABLE).upsert(stripPortionFromRows(rows), {
        onConflict: "username,datum",
      }));
      if (!insertError) {
        return NextResponse.json({
          ok: true,
          username,
          dayCount: rows.length,
          blocks: dbRowsToBlocks(rows),
          warning: portionMigrationHint(),
        });
      }
    }
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
