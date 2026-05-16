import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

const TABLE = "lager_teile";
const CATALOG_PREFIX_RE = /^(SP|SA|SO|SL|SK|SN|SAO|SOE)\s*[- ]?[0-9]/i;

export async function POST(request) {
  if (!(await currentUserHasPermission("warehouse.write"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: warehouse.write erforderlich." },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const mode =
    body.mode === "catalog-prefix" || body.mode === "boels-prefix"
      ? "catalog-prefix"
      : body.mode === "all"
        ? "all"
        : null;

  if (!mode) {
    return NextResponse.json(
      { error: 'mode muss "all" oder "catalog-prefix" sein.' },
      { status: 400 }
    );
  }

  const { data: rows, error } = await db.from(TABLE).select("id, herstellernummer");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const targets =
    mode === "all"
      ? rows ?? []
      : (rows ?? []).filter((row) =>
          CATALOG_PREFIX_RE.test(String(row.herstellernummer ?? "").trim())
        );

  if (!targets.length) {
    return NextResponse.json({ deleted: 0, total: rows?.length ?? 0 });
  }

  const ids = targets.map((row) => row.id);
  const { error: deleteError } = await db.from(TABLE).delete().in("id", ids);

  if (deleteError) {
    return NextResponse.json({ error: deleteError.message }, { status: 500 });
  }

  return NextResponse.json({
    deleted: ids.length,
    total: rows?.length ?? 0,
    mode,
  });
}
