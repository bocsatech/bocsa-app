/**
 * Üzenetek UI — willhaben-szerű szerkezet, magyarul, fehér háttér.
 * Adat: /api/messages/* (ugyanaz, mint a mobilapp).
 */

import { getAuthUser } from "./site-auth.js?v=auth20260805localdb9";
import {
  listConversations,
  listMessages,
  sendMessage,
  markRead,
  markUnread,
  deleteConversation,
  reportConversation,
  blockUser,
  fileToAttachment,
} from "./messages-api.js?v=messagesWh1";

const ICONS = {
  unread: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7.5h10.5A2.5 2.5 0 0 1 18 10v5.5A2.5 2.5 0 0 1 15.5 18H9l-3.2 2.2V18H5A2.5 2.5 0 0 1 2.5 15.5V10A2.5 2.5 0 0 1 5 7.5Z" stroke="currentColor" stroke-width="1.6"/><path d="M7.2 11.2h7.2M7.2 14h4.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  block: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.2" stroke="currentColor" stroke-width="1.7"/><path d="M6.2 6.2 17.8 17.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  report: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 4.2 20.2 19H3.8L12 4.2Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M12 10v4.2M12 16.8v.2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  trash: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 7.5h14M9.2 7.5V5.8h5.6V7.5M8.2 7.5l.7 11.2h6.2l.7-11.2" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10.2 11v5M13.8 11v5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`,
  checks: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m4.5 12.5 3 3 6.5-7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="m10.5 12.5 3 3 6-6.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="6" r="1.5" fill="currentColor"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/><circle cx="12" cy="18" r="1.5" fill="currentColor"/></svg>`,
  back: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M15 6 9 12l6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  paperclip: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M16.5 7.5v8.2a4.5 4.5 0 0 1-9 0V7.2a3 3 0 0 1 6 0v8.1a1.5 1.5 0 0 1-3 0V8.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  send: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M3.4 11.2 19.2 3.8c.7-.3 1.4.4 1.1 1.1L13 20.5c-.3.7-1.3.6-1.5-.1l-1.8-6.1-6.2-1.6c-.8-.2-.9-1.2-.1-1.5Z"/></svg>`,
  car: `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 14.2h2.1l1.2-2.4h7.2l1.3 2.4H18a1.8 1.8 0 0 1 1.8 1.8v1.8a1.2 1.2 0 0 1-1.2 1.2h-.6" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="7.2" cy="18.4" r="1.35" stroke="currentColor" stroke-width="1.4"/><circle cx="15.2" cy="18.4" r="1.35" stroke="currentColor" stroke-width="1.4"/><path d="M5 14.2 6.4 9.8h11.2L19 14.2" stroke="currentColor" stroke-width="1.4"/></svg>`,
};

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function shortDate(iso) {
  const raw = String(iso || "").slice(0, 10);
  if (!raw) return "";
  const [y, m, d] = raw.split("-");
  return `${d}.${m}.${String(y).slice(2)}`;
}

function dayLabel(iso) {
  const day = String(iso || "").slice(0, 10);
  if (!day) return "";
  const today = new Date();
  const ymd = (d) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (day === ymd(today)) return "Ma";
  if (day === ymd(yesterday)) return "Tegnap";
  return day.replaceAll("-", ".");
}

function timeOnly(iso) {
  const s = String(iso || "");
  if (s.length >= 16) return s.slice(11, 16);
  return s;
}

function currentUserId() {
  return Number(getAuthUser()?.id) || 0;
}

function peerLetter(name) {
  return String(name || "?").trim().charAt(0).toUpperCase() || "?";
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
      <aside class="msg-sidebar">
        <div class="msg-sidebar-head">
          <h3 class="msg-sidebar-title">Üzenetek</h3>
          <button type="button" class="msg-text-btn" data-msg-edit>Szerkesztés</button>
        </div>
        <div class="msg-state" data-msg-state hidden></div>
        <div class="msg-conv-list" data-msg-list></div>
        <div class="msg-empty" data-msg-empty hidden>
          <p><strong>Nincs még üzeneted.</strong></p>
          <p>Egy hirdetésnél kattints az Üzenet gombra.</p>
        </div>
      </aside>

      <section class="msg-thread" data-msg-thread>
        <div class="msg-thread-placeholder" data-msg-placeholder>
          <div class="msg-placeholder-inner">
            <p class="msg-placeholder-title">Üzenetek</p>
            <p>Válassz egy beszélgetést a listából.</p>
          </div>
        </div>
        <div class="msg-thread-main" data-msg-thread-main hidden>
          <header class="msg-thread-head">
            <button type="button" class="msg-icon-btn msg-back-mobile" data-msg-back aria-label="Vissza">${ICONS.back}</button>
            <div class="msg-peer-head">
              <span class="msg-peer-avatar-lg" data-msg-peer-avatar aria-hidden="true">?</span>
              <div>
                <strong data-msg-peer>—</strong>
                <span data-msg-peer-status>Bymy üzenet</span>
              </div>
            </div>
            <div class="msg-menu-wrap">
              <button type="button" class="msg-icon-btn" data-msg-menu aria-label="Műveletek" aria-haspopup="menu" aria-expanded="false">${ICONS.menu}</button>
              <div class="msg-menu" data-msg-actions role="menu" hidden>
                <button type="button" role="menuitem" data-msg-action="unread">
                  <span class="msg-menu-icon">${ICONS.unread}</span>
                  <span>Megjelölés olvasatlanként</span>
                </button>
                <button type="button" role="menuitem" data-msg-action="block">
                  <span class="msg-menu-icon">${ICONS.block}</span>
                  <span>Felhasználó tiltása</span>
                </button>
                <button type="button" role="menuitem" data-msg-action="report">
                  <span class="msg-menu-icon">${ICONS.report}</span>
                  <span>Beszélgetés jelentése</span>
                </button>
                <button type="button" role="menuitem" class="is-danger" data-msg-action="delete">
                  <span class="msg-menu-icon">${ICONS.trash}</span>
                  <span>Beszélgetés törlése</span>
                </button>
              </div>
            </div>
          </header>
          <div class="msg-listing-bar" data-msg-listing></div>
          <div class="msg-thread-scroll" data-msg-bubbles></div>
          <p class="msg-error" data-msg-thread-error hidden></p>
          <form class="msg-composer" data-msg-composer>
            <label class="msg-attach-btn" title="Csatolmány">
              ${ICONS.paperclip}
              <input type="file" accept="image/*,.pdf,.doc,.docx,application/pdf" hidden data-msg-file />
            </label>
            <input type="text" name="body" placeholder="Írj üzenetet…" autocomplete="off" data-msg-draft />
            <button type="submit" class="msg-send-btn" data-msg-send aria-label="Küldés">${ICONS.send}</button>
          </form>
        </div>
      </section>
    </div>
  `;

  const els = {
    shell: root.querySelector(".msg-shell"),
    editBtn: root.querySelector("[data-msg-edit]"),
    state: root.querySelector("[data-msg-state]"),
    list: root.querySelector("[data-msg-list]"),
    empty: root.querySelector("[data-msg-empty]"),
    thread: root.querySelector("[data-msg-thread]"),
    placeholder: root.querySelector("[data-msg-placeholder]"),
    threadMain: root.querySelector("[data-msg-thread-main]"),
    peer: root.querySelector("[data-msg-peer]"),
    peerAvatar: root.querySelector("[data-msg-peer-avatar]"),
    peerStatus: root.querySelector("[data-msg-peer-status]"),
    listing: root.querySelector("[data-msg-listing]"),
    bubbles: root.querySelector("[data-msg-bubbles]"),
    threadError: root.querySelector("[data-msg-thread-error]"),
    draft: root.querySelector("[data-msg-draft]"),
    file: root.querySelector("[data-msg-file]"),
    menuBtn: root.querySelector("[data-msg-menu]"),
    actions: root.querySelector("[data-msg-actions]"),
  };

  function setUnreadBadge() {
    const n = conversations.reduce((sum, c) => sum + (Number(c.unread) || 0), 0);
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

  function closeMenu() {
    if (els.actions) els.actions.hidden = true;
    els.menuBtn?.setAttribute("aria-expanded", "false");
  }

  function showInboxOnly() {
    openConv = null;
    els.shell?.setAttribute("data-msg-view", "inbox");
    if (els.placeholder) els.placeholder.hidden = false;
    if (els.threadMain) els.threadMain.hidden = true;
    closeMenu();
    renderList();
  }

  function showThreadPane() {
    els.shell?.setAttribute("data-msg-view", "thread");
    if (els.placeholder) els.placeholder.hidden = true;
    if (els.threadMain) els.threadMain.hidden = false;
  }

  function renderList() {
    if (!els.list) return;
    els.list.innerHTML = "";
    const has = conversations.length > 0;
    if (els.empty) els.empty.hidden = has;
    els.list.hidden = !has;
    setUnreadBadge();

    for (const conv of conversations) {
      const active = openConv && Number(openConv.id) === Number(conv.id);
      const row = document.createElement("article");
      row.className = `msg-conv-row${conv.unread > 0 ? " is-unread" : ""}${active ? " is-active" : ""}`;
      row.dataset.convId = String(conv.id);
      const peerName = conv.peer?.displayName || "Ismeretlen";
      const letter = peerLetter(peerName);
      const preview = conv.lastMessage?.body || "Új beszélgetés";
      row.innerHTML = `
        <div class="msg-conv-thumb" aria-hidden="true">
          <span class="msg-conv-photo">${ICONS.car}</span>
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
                  ? `<span class="msg-conv-checks" aria-hidden="true">${ICONS.checks}</span>`
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
        if (!window.confirm("Törlöd a beszélgetést?")) return;
        try {
          await deleteConversation(conv.id);
          if (openConv && Number(openConv.id) === Number(conv.id)) showInboxOnly();
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
    const letter = peerLetter(openConv.peer?.displayName);
    const groups = new Map();
    for (const msg of messages) {
      const day = String(msg.createdAt || "").slice(0, 10);
      if (!groups.has(day)) groups.set(day, []);
      groups.get(day).push(msg);
    }
    const parts = [];
    for (const [day, items] of groups) {
      parts.push(`<p class="msg-day">${escapeHtml(dayLabel(day))}</p>`);
      for (const msg of items) {
        const mine = Number(msg.senderId) === myId;
        const att = msg.attachment
          ? `<a class="msg-attach-link" href="${escapeHtml(msg.attachment.url || "#")}" target="_blank" rel="noopener">${escapeHtml(msg.attachment.name || "csatolmány")}</a>`
          : "";
        parts.push(`
          <div class="msg-bubble-row ${mine ? "is-mine" : "is-peer"}">
            ${mine ? "" : `<span class="msg-peer-avatar" aria-hidden="true">${escapeHtml(letter)}</span>`}
            <div class="msg-bubble-wrap">
              <div class="msg-bubble">
                ${msg.body ? `<p>${escapeHtml(msg.body)}</p>` : ""}
                ${att}
              </div>
              <div class="msg-bubble-meta">
                <time>${escapeHtml(timeOnly(msg.createdAt))}</time>
                ${mine ? `<span class="msg-conv-checks" aria-hidden="true">${ICONS.checks}</span>` : ""}
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
      <div class="msg-listing-thumb" aria-hidden="true">${ICONS.car}</div>
      <div class="msg-listing-meta">
        <strong>${escapeHtml(openConv.listing?.title || "")}</strong>
        <p class="msg-listing-price">${escapeHtml(openConv.listing?.priceLabel || "")}</p>
        <p class="msg-listing-code">Bymy kód: ${escapeHtml(openConv.listing?.code || "")}</p>
      </div>
    `;
  }

  async function openConversation(conv) {
    openConv = conv;
    const name = conv.peer?.displayName || "—";
    if (els.peer) els.peer.textContent = name;
    if (els.peerAvatar) els.peerAvatar.textContent = peerLetter(name);
    if (els.peerStatus) els.peerStatus.textContent = "Bymy üzenet";
    renderListingBar();
    showThreadPane();
    showThreadError("");
    closeMenu();
    renderList();
    try {
      const data = await listMessages(conv.id);
      openConv = data.conversation || conv;
      messages = data.messages;
      if (els.peer) els.peer.textContent = openConv.peer?.displayName || "—";
      if (els.peerAvatar) els.peerAvatar.textContent = peerLetter(openConv.peer?.displayName);
      renderListingBar();
      renderBubbles();
      await markRead(conv.id);
      const row = conversations.find((c) => Number(c.id) === Number(conv.id));
      if (row) row.unread = 0;
      setUnreadBadge();
      renderList();
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
      if (openConv) {
        const still = conversations.find((c) => Number(c.id) === Number(openConv.id));
        if (!still) showInboxOnly();
      }
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
    showInboxOnly();
    await refresh();
  });

  els.menuBtn?.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!els.actions) return;
    const open = els.actions.hidden;
    els.actions.hidden = !open;
    els.menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  });

  document.addEventListener("click", (event) => {
    if (!root.contains(event.target)) return;
    if (event.target.closest("[data-msg-menu], [data-msg-actions]")) return;
    closeMenu();
  });

  els.actions?.addEventListener("click", async (event) => {
    const btn = event.target.closest("[data-msg-action]");
    if (!btn || !openConv) return;
    const action = btn.getAttribute("data-msg-action");
    closeMenu();
    try {
      if (action === "unread") {
        await markUnread(openConv.id);
        showInboxOnly();
        await refresh();
      } else if (action === "block") {
        if (!window.confirm(`Tiltod a felhasználót: ${openConv.peer?.displayName || ""}?`)) return;
        await blockUser(openConv.peer?.id);
        showInboxOnly();
        await refresh();
      } else if (action === "report") {
        const reason = window.prompt("Miért jelented a beszélgetést? (opcionális)", "") ?? "";
        const result = await reportConversation(openConv.id, reason);
        window.alert(result.message || "Köszönjük, a jelentést megkaptuk.");
      } else if (action === "delete") {
        if (!window.confirm("Törlöd a beszélgetést?")) return;
        await deleteConversation(openConv.id);
        showInboxOnly();
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
      const data = await listMessages(openConv.id);
      openConv = data.conversation || openConv;
      messages = data.messages;
      renderBubbles();
      await markRead(openConv.id);
      await refresh();
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

  showInboxOnly();
  refresh();

  return { refresh, showInbox: showInboxOnly };
}
