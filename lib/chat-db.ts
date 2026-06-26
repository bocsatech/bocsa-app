export const CHAT_MAX_BODY_LENGTH = 100;

export type ChatUserSummary = {
  id: string;
  username: string;
  fullName: string | null;
};

export type ChatThreadSummary = {
  id: string;
  type: "direct" | "group";
  name: string | null;
  updatedAt: string;
  otherUser: ChatUserSummary | null;
  lastMessage: {
    id: string;
    body: string;
    senderId: string;
    createdAt: string;
  } | null;
};

export type ChatMessageRow = {
  id: string;
  threadId: string;
  senderId: string;
  body: string;
  createdAt: string;
  deletedAt: string | null;
};

export function isMissingChatTablesError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  if (error.code === "42P01") return true;
  const message = String(error.message ?? "").toLowerCase();
  return message.includes("chat_threads") || message.includes("chat_messages");
}

export function chatMigrationHint() {
  return "Bitte supabase/chat-setup.sql in Supabase ausführen.";
}

export function normalizeChatBody(value: unknown) {
  const body = String(value ?? "").trim();
  if (!body) {
    return { body: null, error: "Nachricht darf nicht leer sein." };
  }
  if (body.length > CHAT_MAX_BODY_LENGTH) {
    return {
      body: null,
      error: `Maximal ${CHAT_MAX_BODY_LENGTH} Zeichen erlaubt.`,
    };
  }
  return { body, error: null };
}

export function mapUserRow(row: Record<string, unknown>): ChatUserSummary {
  return {
    id: String(row.id),
    username: String(row.username ?? ""),
    fullName: row.full_name ? String(row.full_name) : null,
  };
}

export function displayChatUser(user: ChatUserSummary) {
  return user.fullName?.trim() || user.username;
}
