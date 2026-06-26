import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import {
  chatMigrationHint,
  isMissingChatTablesError,
  softDeleteMessage,
  userIsThreadMember,
} from "../../../../../lib/chat-server.mjs";

export const runtime = "nodejs";

export async function DELETE(_request, context) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { messageId } = await context.params;
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const result = await softDeleteMessage(db, messageId, session.userId);
  if (result.error) {
    if (isMissingChatTablesError(result.error)) {
      return NextResponse.json({ error: chatMigrationHint() }, { status: 503 });
    }
    const status = result.error.includes("nicht gefunden") ? 404 : 403;
    return NextResponse.json({ error: result.error }, { status });
  }

  const access = await userIsThreadMember(db, result.threadId, session.userId);
  if (access.error) {
    return NextResponse.json({ error: access.error }, { status: 500 });
  }
  if (!access.isMember) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
