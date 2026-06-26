import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  chatMigrationHint,
  isMissingChatTablesError,
  listChatUsers,
} from "../../../../lib/chat-server.mjs";

export const runtime = "nodejs";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { users, error } = await listChatUsers(db, session.userId);
  if (error) {
    if (isMissingChatTablesError(error)) {
      return NextResponse.json({ error: chatMigrationHint(), users: [] }, { status: 503 });
    }
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ users });
}
