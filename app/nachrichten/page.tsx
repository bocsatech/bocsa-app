"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AppPageShell from "../components/AppPageShell";
import { supabase } from "../../lib/supabase";
import {
  CHAT_MAX_BODY_LENGTH,
  displayChatUser,
  type ChatMessageRow,
  type ChatThreadSummary,
  type ChatUserSummary,
} from "../../lib/chat-db";
import "./nachrichten.css";

type SessionInfo = {
  userId: string;
  username: string;
};

function formatTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("de-AT", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NachrichtenPage() {
  const [session, setSession] = useState<SessionInfo | null>(null);
  const [users, setUsers] = useState<ChatUserSummary[]>([]);
  const [threads, setThreads] = useState<ChatThreadSummary[]>([]);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessageRow[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === activeThreadId) ?? null,
    [threads, activeThreadId]
  );

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const loadThreads = useCallback(async () => {
    const response = await fetch("/api/chat/threads", {
      cache: "no-store",
      credentials: "include",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error ?? "Unterhaltungen konnten nicht geladen werden.");
    }
    setThreads(result.threads ?? []);
    return result.threads as ChatThreadSummary[];
  }, []);

  const loadUsers = useCallback(async () => {
    const response = await fetch("/api/chat/users", {
      cache: "no-store",
      credentials: "include",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(result.error ?? "Benutzer konnten nicht geladen werden.");
    }
    setUsers(result.users ?? []);
  }, []);

  const loadMessages = useCallback(async (threadId: string) => {
    setLoadingMessages(true);
    const response = await fetch(`/api/chat/threads/${threadId}/messages`, {
      cache: "no-store",
      credentials: "include",
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Nachrichten konnten nicht geladen werden.");
      setMessages([]);
    } else {
      setMessages(result.messages ?? []);
      setError(null);
    }
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    async function bootstrap() {
      setLoading(true);
      setError(null);

      const sessionResponse = await fetch("/api/auth/session", {
        cache: "no-store",
        credentials: "include",
      });
      const sessionResult = await sessionResponse.json().catch(() => ({}));
      if (!sessionResponse.ok || !sessionResult.user?.id) {
        setError("Sitzung konnte nicht geladen werden.");
        setLoading(false);
        return;
      }

      setSession({
        userId: sessionResult.user.id,
        username: sessionResult.user.username ?? sessionResult.username ?? "",
      });

      try {
        await Promise.all([loadUsers(), loadThreads()]);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Laden fehlgeschlagen.");
      } finally {
        setLoading(false);
      }
    }

    bootstrap();
  }, [loadThreads, loadUsers]);

  useEffect(() => {
    if (!activeThreadId) {
      setMessages([]);
      return;
    }
    loadMessages(activeThreadId);
  }, [activeThreadId, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (!activeThreadId) return;

    const channel = supabase
      .channel(`chat-thread-${activeThreadId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "chat_messages",
          filter: `thread_id=eq.${activeThreadId}`,
        },
        () => {
          loadMessages(activeThreadId);
          loadThreads().catch(() => {});
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeThreadId, loadMessages, loadThreads]);

  async function openThreadWithUser(otherUserId: string) {
    setError(null);
    const response = await fetch("/api/chat/threads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ otherUserId }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(result.error ?? "Unterhaltung konnte nicht geöffnet werden.");
      return;
    }

    const updatedThreads = await loadThreads();
    const threadId = result.thread?.id;
    const existing = updatedThreads.find((thread) => thread.id === threadId);
    if (threadId) {
      setActiveThreadId(threadId);
    } else if (existing) {
      setActiveThreadId(existing.id);
    }
  }

  async function sendMessage() {
    if (!activeThreadId || sending) return;

    const body = draft.trim();
    if (!body) return;
    if (body.length > CHAT_MAX_BODY_LENGTH) {
      setError(`Maximal ${CHAT_MAX_BODY_LENGTH} Zeichen erlaubt.`);
      return;
    }

    setSending(true);
    setError(null);

    const response = await fetch(`/api/chat/threads/${activeThreadId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ body }),
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? "Senden fehlgeschlagen.");
    } else {
      setDraft("");
      setMessages((current) => [...current, result.message]);
      await loadThreads();
      scrollToBottom();
    }

    setSending(false);
  }

  async function deleteMessage(messageId: string) {
    if (!window.confirm("Nachricht wirklich löschen?")) return;

    setDeletingId(messageId);
    setError(null);

    const response = await fetch(`/api/chat/messages/${messageId}`, {
      method: "DELETE",
      credentials: "include",
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error ?? "Löschen fehlgeschlagen.");
    } else {
      setMessages((current) => current.filter((message) => message.id !== messageId));
      await loadThreads();
    }

    setDeletingId(null);
  }

  const usersWithoutThread = users.filter(
    (user) => !threads.some((thread) => thread.otherUser?.id === user.id)
  );

  const remainingChars = CHAT_MAX_BODY_LENGTH - draft.length;

  return (
    <AppPageShell activeHref="/nachrichten" subtitle="Betrieb">
      <div className="chatPage">
        <header className="chatPageHeader">
          <div>
            <span className="badge">Intern</span>
            <h1>Nachrichten</h1>
            <p className="subtitle">Nur im Programm — jeder Benutzer kann jeden anschreiben.</p>
          </div>
        </header>

        {error ? <p className="protocolNotice">{error}</p> : null}

        <div className={`chatLayout card ${activeThreadId ? "showConversation" : ""}`}>
          <section className="chatPanel">
            <div className="chatPanelHeader">
              <h2>Unterhaltungen</h2>
            </div>
            <div className="chatPanelScroll">
              {loading ? (
                <p className="scanHint">Wird geladen…</p>
              ) : (
                <div className="chatList">
                  {threads.map((thread) => {
                    const label = thread.otherUser ? displayChatUser(thread.otherUser) : "Unbekannt";
                    return (
                      <button
                        key={thread.id}
                        type="button"
                        className={`chatListItem ${activeThreadId === thread.id ? "active" : ""}`}
                        onClick={() => setActiveThreadId(thread.id)}
                      >
                        <span className="chatListItemTitle">{label}</span>
                        <span className="chatListItemPreview">
                          {thread.lastMessage?.body ?? "Noch keine Nachricht"}
                        </span>
                      </button>
                    );
                  })}

                  {usersWithoutThread.length ? (
                    <>
                      <p className="scanHint">Neue Unterhaltung</p>
                      {usersWithoutThread.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          className="chatUserItem"
                          onClick={() => openThreadWithUser(user.id)}
                        >
                          <span className="chatUserItemTitle">{displayChatUser(user)}</span>
                          <span className="chatUserItemMeta">@{user.username}</span>
                        </button>
                      ))}
                    </>
                  ) : null}

                  {!threads.length && !usersWithoutThread.length ? (
                    <p className="scanHint">Keine Benutzer verfügbar.</p>
                  ) : null}
                </div>
              )}
            </div>
          </section>

          <section className="chatConversation">
            {activeThread ? (
              <>
                <div className="chatConversationHeader">
                  <button
                    type="button"
                    className="pillButton outline chatBackButton"
                    onClick={() => setActiveThreadId(null)}
                  >
                    Zurück
                  </button>
                  <div>
                    <strong>
                      {activeThread.otherUser
                        ? displayChatUser(activeThread.otherUser)
                        : "Unterhaltung"}
                    </strong>
                    {activeThread.otherUser ? (
                      <p className="scanHint">@{activeThread.otherUser.username}</p>
                    ) : null}
                  </div>
                </div>

                <div className="chatMessages">
                  {loadingMessages ? (
                    <p className="scanHint">Nachrichten werden geladen…</p>
                  ) : messages.length ? (
                    messages.map((message) => {
                      const isOwn = message.senderId === session?.userId;
                      return (
                        <article
                          key={message.id}
                          className={`chatMessageRow ${isOwn ? "own" : ""}`}
                        >
                          <div className="chatMessageBubble">
                            <div className="chatMessageMeta">
                              <span>{formatTime(message.createdAt)}</span>
                              {isOwn ? (
                                <button
                                  type="button"
                                  className="chatDeleteButton"
                                  onClick={() => deleteMessage(message.id)}
                                  disabled={deletingId === message.id}
                                >
                                  {deletingId === message.id ? "Löschen…" : "Löschen"}
                                </button>
                              ) : null}
                            </div>
                            <p className="chatMessageBody">{message.body}</p>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <div className="chatEmptyState">
                      <p>Noch keine Nachrichten. Schreib die erste (max. 100 Zeichen).</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <form
                  className="chatComposer"
                  onSubmit={(event) => {
                    event.preventDefault();
                    sendMessage();
                  }}
                >
                  <div className="chatComposerRow">
                    <textarea
                      value={draft}
                      maxLength={CHAT_MAX_BODY_LENGTH}
                      placeholder="Nachricht schreiben…"
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && !event.shiftKey) {
                          event.preventDefault();
                          sendMessage();
                        }
                      }}
                    />
                    <button
                      type="submit"
                      className="pillButton primary"
                      disabled={sending || !draft.trim()}
                    >
                      {sending ? "Senden…" : "Senden"}
                    </button>
                  </div>
                  <p className="chatComposerHint">
                    {remainingChars} Zeichen übrig · Enter senden, Shift+Enter neue Zeile
                  </p>
                </form>
              </>
            ) : (
              <div className="chatEmptyState">
                <p>Wähle links eine Unterhaltung oder starte eine neue.</p>
              </div>
            )}
          </section>
        </div>
      </div>
    </AppPageShell>
  );
}
