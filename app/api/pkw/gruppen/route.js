import { NextResponse } from "next/server";
import { canAccessPkwKunden } from "../../../../lib/pkw-permissions-server.mjs";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import { pkwSupabaseErrorResponse } from "../../../../lib/pkw-server.mjs";

const TABLE = "pkw_gruppe_vorlagen";

export async function GET() {
  if (!(await canAccessPkwKunden("read"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.read" }, { status: 403 });
  }

  const db = getSupabaseAdmin();

  const [{ data: templates, error: templateError }, { data: fahrzeuge, error: fzError }] =
    await Promise.all([
      db.from(TABLE).select("*").order("gruppe", { ascending: true }),
      db.from("pkw_fahrzeuge").select("gruppe"),
    ]);

  if (templateError) {
    return pkwSupabaseErrorResponse(templateError) ?? NextResponse.json({ error: templateError.message }, { status: 500 });
  }
  if (fzError) {
    return pkwSupabaseErrorResponse(fzError) ?? NextResponse.json({ error: fzError.message }, { status: 500 });
  }

  const fromFahrzeuge = (fahrzeuge ?? [])
    .map((row) => String(row.gruppe ?? "").trim())
    .filter(Boolean);
  const gruppen = [...new Set(["ALLGEMEIN", ...fromFahrzeuge, ...(templates ?? []).map((t) => t.gruppe)])].sort(
    (a, b) => a.localeCompare(b, "de")
  );

  return NextResponse.json({ gruppen, templates: templates ?? [] });
}
