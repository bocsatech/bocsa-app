import {
  CHAT_MAX_BODY_LENGTH,
  chatMigrationHint,
  displayChatUser,
  isMissingChatTablesError,
  mapUserRow,
  normalizeChatBody,
} from "./chat-db.ts";

export {
  CHAT_MAX_BODY_LENGTH,
  chatMigrationHint,
  displayChatUser,
  isMissingChatTablesError,
  mapUserRow,
  normalizeChatBody,
};

export async function listChatUsers(db, currentUserId) {
  const { data, error } = await db
    .from("users")
    .select("id, username, full_name, is_active")
    .neq("id", currentUserId)
    .order("username", { ascending: true });

  if (error) {
    return { users: null, error: error.message };
  }

  const users = (data ?? [])
    .filter((row) => row.is_active !== false)
    .map((row) => mapUserRow(row));

  return { users, error: null };
}

export async function userIsThreadMember(db, threadId, userId) {
  const { data, error } = await db
    .from("chat_thread_members")
    .select("user_id")
    .eq("thread_id", threadId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    return { isMember: false, error: error.message };
  }

  return { isMember: Boolean(data), error: null };
}

export async function findDirectThread(db, userAId, userBId) {
  const { data: memberships, error: membershipError } = await db
    .from("chat_thread_members")
    .select("thread_id")
    .eq("user_id", userAId);

  if (membershipError) {
    return { thread: null, error: membershipError.message };
  }

  const threadIds = (memberships ?? []).map((row) => row.thread_id);
  if (!threadIds.length) {
    return { thread: null, error: null };
  }

  const { data: threads, error: threadError } = await db
    .from("chat_threads")
    .select("id, type, name, created_at, updated_at")
    .in("id", threadIds)
    .eq("type", "direct");

  if (threadError) {
    return { thread: null, error: threadError.message };
  }

  for (const thread of threads ?? []) {
    const { data: members, error: membersError } = await db
      .from("chat_thread_members")
      .select("user_id")
      .eq("thread_id", thread.id);

    if (membersError) {
      return { thread: null, error: membersError.message };
    }

    const memberIds = (members ?? []).map((row) => row.user_id);
    if (
      memberIds.length === 2 &&
      memberIds.includes(userAId) &&
      memberIds.includes(userBId)
    ) {
      return { thread, error: null };
    }
  }

  return { thread: null, error: null };
}

export async function createDirectThread(db, userAId, userBId) {
  const { data: thread, error: threadError } = await db
    .from("chat_threads")
    .insert({ type: "direct" })
    .select("id, type, name, created_at, updated_at")
    .single();

  if (threadError) {
    return { thread: null, error: threadError.message };
  }

  const { error: memberError } = await db.from("chat_thread_members").insert([
    { thread_id: thread.id, user_id: userAId },
    { thread_id: thread.id, user_id: userBId },
  ]);

  if (memberError) {
    await db.from("chat_threads").delete().eq("id", thread.id);
    return { thread: null, error: memberError.message };
  }

  return { thread, error: null };
}

async function loadUsersByIds(db, userIds) {
  if (!userIds.length) return {};

  const { data, error } = await db
    .from("users")
    .select("id, username, full_name")
    .in("id", userIds);

  if (error) {
    return {};
  }

  return Object.fromEntries((data ?? []).map((row) => [row.id, mapUserRow(row)]));
}

export async function listThreadsForUser(db, currentUserId) {
  const { data: memberships, error: membershipError } = await db
    .from("chat_thread_members")
    .select("thread_id")
    .eq("user_id", currentUserId);

  if (membershipError) {
    return { threads: null, error: membershipError.message };
  }

  const threadIds = (memberships ?? []).map((row) => row.thread_id);
  if (!threadIds.length) {
    return { threads: [], error: null };
  }

  const { data: threads, error: threadError } = await db
    .from("chat_threads")
    .select("id, type, name, updated_at")
    .in("id", threadIds)
    .order("updated_at", { ascending: false });

  if (threadError) {
    return { threads: null, error: threadError.message };
  }

  const { data: allMembers, error: membersError } = await db
    .from("chat_thread_members")
    .select("thread_id, user_id")
    .in("thread_id", threadIds);

  if (membersError) {
    return { threads: null, error: membersError.message };
  }

  const otherUserIds = new Set();
  const membersByThread = new Map();

  for (const row of allMembers ?? []) {
    const list = membersByThread.get(row.thread_id) ?? [];
    list.push(row.user_id);
    membersByThread.set(row.thread_id, list);
    if (row.user_id !== currentUserId) {
      otherUserIds.add(row.user_id);
    }
  }

  const usersById = await loadUsersByIds(db, [...otherUserIds]);

  const { data: messages, error: messagesError } = await db
    .from("chat_messages")
    .select("id, thread_id, sender_id, body, created_at")
    .in("thread_id", threadIds)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (messagesError) {
    return { threads: null, error: messagesError.message };
  }

  const lastMessageByThread = new Map();
  for (const message of messages ?? []) {
    if (!lastMessageByThread.has(message.thread_id)) {
      lastMessageByThread.set(message.thread_id, message);
    }
  }

  const summaries = (threads ?? []).map((thread) => {
    const memberIds = membersByThread.get(thread.id) ?? [];
    const otherId = memberIds.find((id) => id !== currentUserId) ?? null;
    const lastMessage = lastMessageByThread.get(thread.id);

    return {
      id: thread.id,
      type: thread.type,
      name: thread.name,
      updatedAt: thread.updated_at,
      otherUser: otherId ? usersById[otherId] ?? null : null,
      lastMessage: lastMessage
        ? {
            id: lastMessage.id,
            body: lastMessage.body,
            senderId: lastMessage.sender_id,
            createdAt: lastMessage.created_at,
          }
        : null,
    };
  });

  return { threads: summaries, error: null };
}

export async function listThreadMessages(db, threadId) {
  const { data, error } = await db
    .from("chat_messages")
    .select("id, thread_id, sender_id, body, created_at, deleted_at")
    .eq("thread_id", threadId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  if (error) {
    return { messages: null, error: error.message };
  }

  const messages = (data ?? []).map((row) => ({
    id: row.id,
    threadId: row.thread_id,
    senderId: row.sender_id,
    body: row.body,
    createdAt: row.created_at,
    deletedAt: row.deleted_at,
  }));

  return { messages, error: null };
}

export async function sendThreadMessage(db, threadId, senderId, body) {
  const { data, error } = await db
    .from("chat_messages")
    .insert({
      thread_id: threadId,
      sender_id: senderId,
      body,
    })
    .select("id, thread_id, sender_id, body, created_at, deleted_at")
    .single();

  if (error) {
    return { message: null, error: error.message };
  }

  const { error: touchError } = await db
    .from("chat_threads")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", threadId);

  if (touchError) {
    return { message: null, error: touchError.message };
  }

  return {
    message: {
      id: data.id,
      threadId: data.thread_id,
      senderId: data.sender_id,
      body: data.body,
      createdAt: data.created_at,
      deletedAt: data.deleted_at,
    },
    error: null,
  };
}

export async function softDeleteMessage(db, messageId, userId) {
  const { data: message, error: loadError } = await db
    .from("chat_messages")
    .select("id, sender_id, thread_id, deleted_at")
    .eq("id", messageId)
    .maybeSingle();

  if (loadError) {
    return { ok: false, error: loadError.message };
  }

  if (!message || message.deleted_at) {
    return { ok: false, error: "Nachricht nicht gefunden." };
  }

  if (message.sender_id !== userId) {
    return { ok: false, error: "Nur eigene Nachrichten können gelöscht werden." };
  }

  const { error } = await db
    .from("chat_messages")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true, threadId: message.thread_id, error: null };
}
