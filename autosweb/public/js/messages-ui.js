/**
 * Üzenetek UI — mobil MessagesScreen / ChatThreadScreen mintára.
 * Adattárolás: ugyanaz a /api/messages/* API (szerver SQLite).
 */

import { getAuthUser } from "./site-auth.js?v=auth20260805localdb9";
import {
  listConversations,
  listMessages,
  sendMessage,
  markRead,
  markUnread,
  deleteConversation,
  blockUser,
  fileToAttachment,
} from "./messages-api.js?v=messagesSync1";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shortDate(iso) {
  return String(iso || "").slice(0, 10).replaceAll("-", ".");
}

function timeOnly(iso) {
  const s = String(iso || "");
  if (s.length >= 16) return s.slice(11, 16);
  return s;
}

function currentUserId() {
  return Number(getAuthUser()?.id) || 0;
}

export function initMessagesUi(root, { onUnreadChange } = {}) {
  if (!root) return { refresh: async () => {} };

  let conversations = [];
  let editing = false;
  let openConv = null;
  let messages = [];
  let busy = false;

  root.innerHTML = `
    <div class="msg-shell" data-msg-view="inbox">
      <div class="msg-inbox">
        <div class="msg-inbox-toolbar">
          <p class="msg-inbox-sub" data-msg-unread>Nincs olvasatlan</p>
          <button type="button" class="msg-text-btn" data-msg-edit>Szerkesztés</button>
        </div>
        <div class="msg-state" data-msg-state hidden></div>
        <div class="msg-conv-list" data-msg-list></div>
        <div class="msg-empty" data-msg-empty hidden>
          <p><strong>Nincs még üzeneted.</strong></p>
          <p>Egy hirdetésnél kattints az Üzenet gombra.</p>
        </div>
      </div>

      <div class="msg-thread" data-msg-thread hidden>
        <header class="msg-thread-head">
          <button type="button" class="msg-icon-btn" data-msg-back aria-label="Vissza">‹</button>
          <div class="msg-thread-titles">
            <strong data-msg-peer>—</strong>
            <span>Bymy üzenet</span>
          </div>
          <button type="button" class="msg-icon-btn" data-msg-menu aria-label="Műveletek">⋯</button>
        </header>
        <div class="msg-listing-bar" data-msg-listing></div>
        <div class="msg-thread-scroll" data-msg-bubbles></div>
        <p class="msg-error" data-msg-thread-error hidden></p>
        <form class="msg-composer" data-msg-composer>
          <label class="msg-attach-btn" title="Csatolmány">
            <span aria-hidden="true">+</span>
            <input type="file" accept="image/*,.pdf,.doc,.docx,application/pdf" hidden data-msg-file />
          </label>
          <input type="text" name="body" placeholder="Üzenet…" autocomplete="off" data-msg-draft />
          <button type="submit" class="msg-send-btn" data-msg-send aria-label="Küldés">Küld</button>
        </form>
        <div class="msg-actions-sheet" data-msg-actions hidden>
          <button type="button" data-msg-action="unread">Olvasatlanként jelölés</button>
          <button type="button" class="is-danger" data-msg-action="block">Feladó blokkolása</button>
          <button type="button" class="is-danger" data-msg-action="delete">Beszélgetés törlése</button>
          <button type="button" data-msg-action="cancel">Mégse</button>
        </div>
      </div>
    </div>
  `;

  const els = {
    shell: root.querySelector(".msg-shell"),
    unread: root.querySelector("[data-msg-unread]"),
    editBtn: root.querySelector("[data-msg-edit]"),
    state: root.querySelector("[data-msg-state]"),
    list: root.querySelector("[data-msg-list]"),
    empty: root.querySelector("[data-msg-empty]"),
    thread: root.querySelector("[data-msg-thread]"),
    inbox: root.querySelector(".msg-inbox"),
    peer: root.querySelector("[data-msg-peer]"),
    listing: root.querySelector("[data-msg-listing]"),
    bubbles: root.querySelector("[data-msg-bubbles]"),
    threadError: root.querySelector("[data-msg-thread-error]"),
    draft: root.querySelector("[data-msg-draft]"),
    file: root.querySelector("[data-msg-file]"),
    actions: root.querySelector("[data-msg-actions]"),
  };

  function setUnreadLabel() {
    const n = conversations.reduce((sum, c) => sum + (Number(c.unread) || 0), 0);
    if (els.unread) els.unread.textContent = n === 0 ? "Nincs olvasatlan" : `${n} olvasatlan`;
    onUnreadChange?.(n);
  }

  function showState(text, isError = false) {
    if (!els.state) return;
    if (!text) {
      els.state.hidden = true;
      els.state.textContent = "";
      return;
    }
    els.state.hidden = false;
    els.state.textContent = text;
    els.state.classList.toggle("is-error", isError);
  }

  function showInbox() {
    openConv = null;
    if (els.inbox) els.inbox.hidden = false;
    if (els.thread) els.thread.hidden = true;
    if (els.actions) els.actions.hidden = true;
    els.shell?.setAttribute("data-msg-view", "inbox");
  }

  function showThread() {
    if (els.inbox) els.inbox.hidden = true;
    if (els.thread) els.thread.hidden = false;
    els.shell?.setAttribute("data-msg-view", "thread");
  }

  function renderList() {
    if (!els.list) return;
    els.list.innerHTML = "";
    const has = conversations.length > 0;
    if (els.empty) els.empty.hidden = has;
    els.list.hidden = !has;
    setUnreadLabel();

    for (const conv of conversations) {
      const row = document.createElement("article");
      row.className = `msg-conv-row${conv.unread > 0 ? " is-unread" : ""}`;
      row.dataset.convId = String(conv.id);
      const peerName = conv.peer?.displayName || "Ismeretlen";
      const letter = (peerName.charAt(0) || "?").toUpperCase();
      const preview = conv.lastMessage?.body || "Új beszélgetés";
      row.innerHTML = `
        <div class="msg-conv-thumb" aria-hidden="true">
          <span class="msg-conv-car"></span>
          <span class="msg-conv-letter">${escapeHtml(letter)}</span>
        </div>
        <div class="msg-conv-main">
          <div class="msg-conv-top">
            <strong>${escapeHtml(peerName)}</strong>
            <time>${escapeHtml(shortDate(conv.updatedAt))}</time>
          </div>
          <p class="msg-conv-listing">${escapeHtml(conv.listing?.title || "")}</p>
          <div class="msg-conv-bottom">
            <span class="msg-conv-preview">${escapeHtml(preview)}</span>
            ${
              conv.unread > 0
                ? `<span class="msg-conv-badge">${escapeHtml(String(conv.unread))}</span>`
                : conv.lastMessage
                  ? `<span class="msg-conv-check" aria-hidden="true">✓</span>`
                  : ""
            }
          </div>
        </div>
        ${
          editing
            ? `<button type="button" class="msg-conv-del" data-msg-del="${conv.id}" aria-label="Törlés">Törlés</button>`
            : ""
        }
      `;
      row.addEventListener("click", (event) => {
        if (event.target.closest("[data-msg-del]")) return;
        openConversation(conv);
      });
      row.querySelector("[data-msg-del]")?.addEventListener("click", async (event) => {
        event.stopPropagation();
        try {
          await deleteConversation(conv.id);
          await refresh();
        } catch (error) {
          showState(error.message || "Törlés sikertelen.", true);
        }
      });
      els.list.appendChild(row);
    }
  }

  function renderBubbles() {
    if (!els.bubbles || !openConv) return;
    const myId = currentUserId();
    const peerLetter = String(openConv.peer?.displayName || "?").charAt(0).toUpperCase();
    const groups = new Map();
    for (const msg of messages) {
      const day = String(msg.createdAt || "").slice(0, 10);
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(msg);
    }
    const parts = [];
    for (const [day, items] of groups) {
      parts.push(`<p class="msg-day">${escapeHtml(day.replaceAll("-", "."))}</p>`);
      for (const msg of items) {
        const mine = Number(msg.senderId) === myId;
        const att = msg.attachment
          ? `<a class="msg-attach-link" href="${escapeHtml(msg.attachment.url || "#")}" target="_blank" rel="noopener">${escapeHtml(msg.attachment.name || "csatolmány")}</a>`
          : "";
        parts.push(`
          <div class="msg-bubble-row ${mine ? "is-mine" : "is-peer"}">
            ${mine ? "" : `<span class="msg-peer-avatar" aria-hidden="true">${escapeHtml(peerLetter)}</span>`}
            <div class="msg-bubble-wrap">
              <div class="msg-bubble">
                ${msg.body ? `<p>${escapeHtml(msg.body)}</p>` : ""}
                ${att}
              </div>
              <div class="msg-bubble-meta">
                <time>${escapeHtml(timeOnly(msg.createdAt))}</time>
                ${mine ? `<span aria-hidden="true">✓</span>` : ""}
              </div>
            </div>
          </div>
        `);
      }
    }
    els.bubbles.innerHTML = parts.join("");
    els.bubbles.scrollTop = els.bubbles.scrollHeight;
  }

  function renderListingBar() {
    if (!els.listing || !openConv) return;
    els.listing.innerHTML = `
      <div class="msg-listing-thumb" aria-hidden="true"></div>
      <div>
        <strong>${escapeHtml(openConv.listing?.title || "")}</strong>
        <p class="msg-listing-price">${escapeHtml(openConv.listing?.priceLabel || "")}</p>
        <p class="msg-listing-code">Bymy kód: ${escapeHtml(openConv.listing?.code || "")}</p>
      </div>
    `;
  }

  async function openConversation(conv) {
    openConv = conv;
    if (els.peer) els.peer.textContent = conv.peer?.displayName || "—";
    renderListingBar();
    showThread();
    showThreadError("");
    try {
      const data = await listMessages(conv.id);
      openConv = data.conversation || conv;
      messages = data.messages;
      if (els.peer) els.peer.textContent = openConv.peer?.displayName || "—";
      renderListingBar();
      renderBubbles();
      await markRead(conv.id);
      const row = conversations.find((c) => c.id === conv.id);
      if (row) row.unread = 0;
      setUnreadLabel();
    } catch (error) {
      showThreadError(error.message || "Betöltés sikertelen.");
    }
  }

  function showThreadError(text) {
    if (!els.threadError) return;
    els.threadError.hidden = !text;
    els.threadError.textContent = text || "";
  }

  async function refresh() {
    showState("Betöltés…");
    try {
      conversations = await listConversations();
      showState("");
      renderList();
    } catch (error) {
      conversations = [];
      renderList();
      showState(error.message || "Betöltés sikertelen.", true);
      if (els.empty) els.empty.hidden = true;
    }
  }

  els.editBtn?.addEventListener("click", () => {
    editing = !editing;
    els.editBtn.textContent = editing ? "Kész" : "Szerkesztés";
    renderList();
  });

  root.querySelector("[data-msg-back]")?.addEventListener("click", async () => {
    showInbox();
    await refresh();
  });

  root.querySelector("[data-msg-menu]")?.addEventListener("click", () => {
    if (els.actions) els.actions.hidden = !els.actions.hidden;
  });

  els.actions?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-msg-action]");
    if (!btn || !openConv) return;
    const action = btn.getAttribute("data-msg-action");
    els.actions.hidden = true;
    try {
      if (action === "unread") {
        await markUnread(openConv.id);
        showInbox();
        await refresh();
      } else if (action === "block") {
        await blockUser(openConv.peer?.id);
        showInbox();
        await refresh();
      } else if (action === "delete") {
        await deleteConversation(openConv.id);
        showInbox();
        await refresh();
      }
    } catch (error) {
      showThreadError(error.message || "Művelet sikertelen.");
    }
  });

  root.querySelector("[data-msg-composer]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!openConv || busy) return;
    const text = String(els.draft?.value || "").trim();
    if (!text) return;
    busy = true;
    try {
      await sendMessage(openConv.id, { body: text });
      if (els.draft) els.draft.value = "";
      draft = "";
      const data = await listMessages(openConv.id);
      openConv = data.conversation || openConv;
      messages = data.messages;
      renderBubbles();
      await markRead(openConv.id);
    } catch (error) {
      showThreadError(error.message || "Küldés sikertelen.");
    } finally {
      busy = false;
    }
  });

  els.file?.addEventListener("change", async () => {
    const file = els.file.files?.[0];
    els.file.value = "";
    if (!file || !openConv || busy) return;
    busy = true;
    try {
      const attachment = await fileToAttachment(file);
      const text = String(els.draft?.value || "").trim();
      await sendMessage(openConv.id, { body: text, attachment });
      if (els.draft) els.draft.value = "";
      const data = await listMessages(openConv.id);
      openConv = data.conversation || openConv;
      messages = data.messages;
      renderBubbles();
      await markRead(openConv.id);
    } catch (error) {
      showThreadError(error.message || "Csatolmány küldése sikertelen.");
    } finally {
      busy = false;
    }
  });

  showInbox();
  refresh();

  return { refresh, showInbox };
}
