import { NextResponse } from "next/server";
import { currentUserIsInGroup } from "../../../../lib/auth/permissions";
import { runLagerInventurSchemaSetup } from "../../../../lib/lager-inventur-setup-server.mjs";

export const runtime = "nodejs";

export async function POST() {
  const isAdmin = await currentUserIsInGroup("Admin");
  if (!isAdmin) {
    return NextResponse.json({ error: "Nur für Admin." }, { status: 403 });
  }

  const result = await runLagerInventurSchemaSetup();
  if (!result.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        manual: result.manual,
        sqlEditorUrl: result.sqlEditorUrl ?? null,
        file: result.file ?? "lager-inventur-sessions.sql",
      },
      { status: result.manual ? 503 : 500 }
    );
  }

  return NextResponse.json({ ok: true, file: result.file });
}
