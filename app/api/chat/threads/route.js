import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  chatMigrationHint,
  createDirectThread,
  findDirectThread,
  isMissingChatTablesError,
  listThreadsForUser,
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

  const { threads, error } = await listThreadsForUser(db, session.userId);
  if (error) {
    if (isMissingChatTablesError(error)) {
      return NextResponse.json({ error: chatMigrationHint(), threads: [] }, { status: 503 });
    }
    return NextResponse.json({ error }, { status: 500 });
  }

  return NextResponse.json({ threads });
}

export async function POST(request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const otherUserId = String(body.otherUserId ?? "").trim();
  if (!otherUserId) {
    return NextResponse.json({ error: "otherUserId fehlt." }, { status: 400 });
  }
  if (otherUserId === session.userId) {
    return NextResponse.json({ error: "Eigener Benutzer ist nicht erlaubt." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { data: otherUser, error: otherUserError } = await db
    .from("users")
    .select("id, is_active")
    .eq("id", otherUserId)
    .maybeSingle();

  if (otherUserError) {
    if (isMissingChatTablesError(otherUserError)) {
      return NextResponse.json({ error: chatMigrationHint() }, { status: 503 });
    }
    return NextResponse.json({ error: otherUserError.message }, { status: 500 });
  }

  if (!otherUser || otherUser.is_active === false) {
    return NextResponse.json({ error: "Benutzer nicht gefunden." }, { status: 404 });
  }

  const existing = await findDirectThread(db, session.userId, otherUserId);
  if (existing.error) {
    if (isMissingChatTablesError(existing.error)) {
      return NextResponse.json({ error: chatMigrationHint() }, { status: 503 });
    }
    return NextResponse.json({ error: existing.error }, { status: 500 });
  }

  if (existing.thread) {
    return NextResponse.json({ thread: existing.thread });
  }

  const created = await createDirectThread(db, session.userId, otherUserId);
  if (created.error) {
    if (isMissingChatTablesError(created.error)) {
      return NextResponse.json({ error: chatMigrationHint() }, { status: 503 });
    }
    return NextResponse.json({ error: created.error }, { status: 500 });
  }

  return NextResponse.json({ thread: created.thread }, { status: 201 });
}
