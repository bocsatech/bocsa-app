import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../../../lib/supabaseAdmin";
import {
  chatMigrationHint,
  isMissingChatTablesError,
  listThreadMessages,
  normalizeChatBody,
  sendThreadMessage,
  userIsThreadMember,
} from "../../../../../../lib/chat-server.mjs";

export const runtime = "nodejs";

async function requireThreadAccess(db, threadId, userId) {
  const { isMember, error } = await userIsThreadMember(db, threadId, userId);
  if (error) {
    return { ok: false, response: NextResponse.json({ error }, { status: 500 }) };
  }
  if (!isMember) {
    return { ok: false, response: NextResponse.json({ error: "Kein Zugriff." }, { status: 403 }) };
  }
  return { ok: true };
}

export async function GET(_request, context) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { threadId } = await context.params;
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const access = await requireThreadAccess(db, threadId, session.userId);
  if (!access.ok) {
    return access.response;
  }

  const { messages, error } = await listThreadMessages(db, threadId);
  if (error) {
    if (isMissingChatTablesError(error)) {
      return NextResponse.json({ error: chatMigrationHint(), messages: [] }, { status: 503 });
    }
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ messages });
}

export async function POST(request, context) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { threadId } = await context.params;
  const body = await request.json().catch(() => ({}));
  const normalized = normalizeChatBody(body.body);
  if (normalized.error) {
    return NextResponse.json({ error: normalized.error }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const access = await requireThreadAccess(db, threadId, session.userId);
  if (!access.ok) {
    return access.response;
  }

  const sent = await sendThreadMessage(db, threadId, session.userId, normalized.body);
  if (sent.error) {
    if (isMissingChatTablesError(sent.error)) {
      return NextResponse.json({ error: chatMigrationHint() }, { status: 503 });
    }
    return NextResponse.json({ error: sent.error }, { status: 500 });
  }

  return NextResponse.json({ message: sent.message }, { status: 201 });
}
