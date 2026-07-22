const $ = (s) => document.querySelector(s);

const statusEl = $('#status');
const convList = $('#convList');
const empty = $('#empty');
const thread = $('#thread');
const tTitle = $('#tTitle');
const tAd = $('#tAd');
const msgs = $('#msgs');
const replyForm = $('#replyForm');
const replyText = $('#replyText');
const btnSync = $('#btnSync');
const tplPick = $('#tplPick');
const btnInsertTpl = $('#btnInsertTpl');
const btnOfferMode = $('#btnOfferMode');
const offerSection = $('#offerSection');
const tplForm = $('#tplForm');
const tplName = $('#tplName');
const tplText = $('#tplText');
const tplList = $('#tplList');
const btnNewTpl = $('#btnNewTpl');
const chartFile = $('#chartFile');
const chartMeta = $('#chartMeta');
const lookupResult = $('#lookupResult');
const btnLookup = $('#btnLookup');
const btnDelConv = $('#btnDelConv');
const toast = $('#toast');

let selectedId = null;
let editingTplId = null;
let offerMode = false;
let currentConv = null;
let openSeq = 0;
let lastGoodStatus = '';

function toastMsg(m, err = false) {
  toast.textContent = m;
  toast.classList.remove('hidden');
  toast.style.borderColor = err ? '#ef4444' : varBorder();
  setTimeout(() => toast.classList.add('hidden'), 3500);
}
function varBorder() {
  return getComputedStyle(document.documentElement).getPropertyValue('--border');
}

async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function renderMessages(list) {
  if (!list.length) {
    msgs.innerHTML = '<p class="muted">Nincs üzenet ebben a beszélgetésben.</p>';
    return;
  }
  msgs.innerHTML = list
    .map((m) => {
      const mid = m.id || '';
      const del = mid && mid !== 'ui-preview' && mid !== 'preview-1'
        ? `<button type="button" class="msg-del" data-mid="${esc(mid)}" title="Üzenet törlése">×</button>`
        : '';
      return `<div class="msg ${m.direction === 'out' ? 'out' : 'in'}" data-mid="${esc(mid)}">${del}${esc(m.text)}</div>`;
    })
    .join('');
  msgs.querySelectorAll('.msg-del').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (!selectedId || !btn.dataset.mid) return;
      if (!confirm('Üzenet törlése?\n(Willhaben API-n is megpróbáljuk.)')) return;
      try {
        const result = await api(
          `/api/conversations/${encodeURIComponent(selectedId)}/messages/${encodeURIComponent(btn.dataset.mid)}`,
          { method: 'DELETE' },
        );
        currentConv = result.conversation;
        renderMessages(result.conversation?.messages || []);
        await loadConversations();
        toastMsg(result.warning || 'Üzenet törölve');
      } catch (err) {
        toastMsg(err.message, true);
      }
    });
  });
  msgs.scrollTop = msgs.scrollHeight;
}

async function deleteSelectedConversation() {
  if (!selectedId) return;
  const name = currentConv?.partnerName || 'ez a beszélgetés';
  if (!confirm(`Törlöd: ${name}?\n(Willhabenről is törlődik.)`)) return;
  try {
        toastMsg('Törlés Willhabenről…');
        btnDelConv.disabled = true;
        const result = await api(`/api/conversations/${encodeURIComponent(selectedId)}`, { method: 'DELETE' });
        selectedId = null;
        currentConv = null;
        thread.classList.add('hidden');
        empty.classList.remove('hidden');
        await loadConversations();
        toastMsg(result.warning || 'Törölve (Willhaben + agent)', Boolean(result.warning));
      } catch (err) {
        toastMsg(err.message, true);
      } finally {
        btnDelConv.disabled = false;
      }
}

function fmtTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('hu-HU', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
}

async function refreshStatus() {
  const s = await api('/api/status');
  const parts = [`v${s.version}`];
  if (s.lastSyncAt) parts.push(`sync: ${fmtTime(s.lastSyncAt)}`);
  if (s.syncRunning) parts.push(s.syncStatus || 'szinkron…');
  else if (s.lastSyncError) parts.push(`⚠ ${s.lastSyncError}`);
  lastGoodStatus = parts.join(' · ');
  statusEl.textContent = lastGoodStatus;
  btnSync.disabled = s.syncRunning;
}

async function loadConversations() {
  const { conversations } = await api('/api/conversations');
  convList.innerHTML = conversations.length
    ? conversations
        .map(
          (c) => {
            const prev = c.lastPreview || c.adTitle || '';
            return `
      <div class="item${c.id === selectedId ? ' active' : ''}" data-id="${esc(c.id)}" data-preview="${esc(prev)}" role="button" tabindex="0">
        <span class="meta">
          <span class="name">${esc(c.partnerName)}</span>
          <span class="prev">${esc(prev)}</span>
        </span>
        <button type="button" class="del" data-del="${esc(c.id)}" title="Törlés">×</button>
      </div>`;
          },
        )
        .join('')
    : '<p class="muted">Nincs beszélgetés. Frissítsd a bejövő üzeneteket.</p>';
  convList.querySelectorAll('.item[data-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      if (e.target.closest('.del')) return;
      openConv(btn.dataset.id);
    });
    btn.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openConv(btn.dataset.id);
      }
    });
  });
  convList.querySelectorAll('.del[data-del]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = btn.dataset.del;
      const name = btn.closest('.item')?.querySelector('.name')?.textContent || 'beszélgetés';
      if (!confirm(`Törlöd: ${name}?\n(Willhabenről is törlődik.)`)) return;
      try {
        toastMsg('Törlés Willhabenről…');
        const result = await api(`/api/conversations/${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (selectedId === id) {
          selectedId = null;
          currentConv = null;
          thread.classList.add('hidden');
          empty.classList.remove('hidden');
        }
        await loadConversations();
        toastMsg(result.warning || 'Törölve (Willhaben + agent)', Boolean(result.warning));
      } catch (err) {
        toastMsg(err.message, true);
      }
    });
  });
  return conversations;
}

async function openConv(id) {
  const seq = ++openSeq;
  selectedId = id;
  msgs.innerHTML = '<p class="muted">Betöltés…</p>';
  tTitle.textContent = '…';
  tAd.textContent = '';
  empty.classList.add('hidden');
  thread.classList.remove('hidden');

  const listBtn = convList.querySelector(`.item[data-id="${CSS.escape(id)}"]`);
  const listPreview = (listBtn?.dataset?.preview || listBtn?.querySelector('.prev')?.textContent || '').trim();

  convList.querySelectorAll('.item[data-id]').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.id === id);
  });

  const { conversation: c } = await api(`/api/conversations/${encodeURIComponent(id)}`);
  if (seq !== openSeq || selectedId !== id) return;

  currentConv = c;
  tTitle.textContent = c.partnerName || '—';
  tAd.textContent = c.adTitle || '';
  const list = Array.isArray(c.messages) ? c.messages : [];
  const fallbackText = c.lastPreview || listPreview || '';
  const display = list.length
    ? list
    : (fallbackText && !/^\d{1,2}:\d{2}$/.test(fallbackText)
      ? [{ id: 'ui-preview', direction: 'in', text: fallbackText }]
      : []);
  renderMessages(display);
}

async function loadTemplates() {
  const { templates } = await api('/api/templates');
  tplPick.innerHTML = templates.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
  tplList.innerHTML = templates
    .map(
      (t) => `
    <li>
      <span>${esc(t.name)}</span>
      <span>
        <button type="button" class="btn ghost" data-edit="${esc(t.id)}">Szerk</button>
        <button type="button" class="btn ghost" data-del="${esc(t.id)}">Töröl</button>
      </span>
    </li>`,
    )
    .join('');
  tplList.querySelectorAll('[data-edit]').forEach((b) => {
    b.addEventListener('click', () => {
      const t = templates.find((x) => x.id === b.dataset.edit);
      if (!t) return;
      editingTplId = t.id;
      tplName.value = t.name;
      tplText.value = t.text;
    });
  });
  tplList.querySelectorAll('[data-del]').forEach((b) => {
    b.addEventListener('click', async () => {
      if (!confirm('Sablon törlése?')) return;
      await api(`/api/templates/${encodeURIComponent(b.dataset.del)}`, { method: 'DELETE' });
      await loadTemplates();
    });
  });
}

function setOfferMode(on) {
  offerMode = on;
  offerSection.classList.toggle('hidden', !on);
  offerSection.classList.toggle('visible', on);
  btnOfferMode.classList.toggle('primary', on);
  btnOfferMode.textContent = on ? 'Árajánlat mód BE' : 'Árajánlat mód';
  if (on && currentConv) btnLookup.classList.remove('hidden');
}

async function refreshChartMeta() {
  const { priceChart } = await api('/api/price-chart');
  if (!priceChart?.rows?.length) {
    chartMeta.textContent = 'Nincs feltöltve.';
    return;
  }
  chartMeta.textContent = `${priceChart.filename} — ${priceChart.rowCount} sor`;
}

btnSync.addEventListener('click', async () => {
  try {
    await api('/api/sync', { method: 'POST' });
    toastMsg('Szinkron indul…');
  } catch (e) {
    toastMsg(e.message, true);
  }
});

btnOfferMode.addEventListener('click', () => setOfferMode(!offerMode));

btnInsertTpl.addEventListener('click', async () => {
  const id = tplPick.value;
  if (!id) return;
  const vars = {
    partner: currentConv?.partnerName || '',
    autocim: currentConv?.adTitle || '',
    angebot_eur: lookupResult.dataset.eur || '',
  };
  const { text } = await api('/api/templates/apply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ templateId: id, vars }),
  });
  replyText.value = (replyText.value ? `${replyText.value}\n` : '') + text;
});

tplForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  await api('/api/templates', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: editingTplId, name: tplName.value, text: tplText.value }),
  });
  editingTplId = null;
  tplName.value = '';
  tplText.value = '';
  await loadTemplates();
  toastMsg('Sablon mentve');
});

btnNewTpl.addEventListener('click', () => {
  editingTplId = null;
  tplName.value = '';
  tplText.value = '';
});

chartFile.addEventListener('change', async () => {
  const file = chartFile.files?.[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  try {
    await api('/api/price-chart', { method: 'POST', body: fd });
    await refreshChartMeta();
    toastMsg('Árdiagram feltöltve');
  } catch (e) {
    toastMsg(e.message, true);
  }
  chartFile.value = '';
});

btnLookup.addEventListener('click', async () => {
  if (!currentConv) return;
  const title = `${currentConv.adTitle || ''} ${currentConv.partnerName || ''}`;
  const year = title.match(/\b(19|20)\d{2}\b/)?.[0] || '';
  const km = title.match(/(\d[\d.\s]*)\s*km/i)?.[1]?.replace(/\D/g, '') || null;
  const { match } = await api('/api/price-chart/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      marke: title.split(/\s+/)[0] || '',
      modell: title,
      baujahr: year,
      km: km ? Number(km) : null,
    }),
  });
  if (!match) {
    lookupResult.textContent = 'Nincs egyezés az árdiagramban.';
    lookupResult.dataset.eur = '';
    return;
  }
  lookupResult.textContent = `Becsült érték: ${match.wertEur?.toLocaleString('hu-HU')} € (${match.marke} ${match.modell})`;
  lookupResult.dataset.eur = String(match.wertEur ?? '');
});

replyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedId) return;
  const text = replyText.value.trim();
  if (!text) return;
  try {
    replyForm.querySelector('[type=submit]').disabled = true;
    await api(`/api/conversations/${encodeURIComponent(selectedId)}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    replyText.value = '';
    toastMsg('Elküldve');
    await openConv(selectedId);
  } catch (err) {
    toastMsg(err.message, true);
  } finally {
    replyForm.querySelector('[type=submit]').disabled = false;
  }
});

async function tick() {
  try {
    await refreshStatus();
    await loadConversations();
    // Ha van kiválasztott beszélgetés, frissítsd az üzeneteket is (szinkron után)
    if (selectedId) {
      const seq = openSeq;
      const id = selectedId;
      const { conversation: c } = await api(`/api/conversations/${encodeURIComponent(id)}`);
      if (seq !== openSeq || selectedId !== id || c.id !== id) return;
      currentConv = c;
      const list = c.messages || [];
      const listBtn = convList.querySelector(`.item[data-id="${CSS.escape(id)}"]`);
      const listPreview = (listBtn?.dataset?.preview || '').trim();
      const fallbackText = c.lastPreview || listPreview || '';
      const display = list.length
        ? list
        : (fallbackText && !/^\d{1,2}:\d{2}$/.test(fallbackText)
          ? [{ id: 'ui-preview', direction: 'in', text: fallbackText }]
          : []);
      const signature = display.map((m) => `${m.id}:${m.text}`).join('|');
      if (msgs.dataset.sig !== signature) {
        msgs.dataset.sig = signature;
        renderMessages(display);
        tTitle.textContent = c.partnerName || '—';
        tAd.textContent = c.adTitle || '';
      }
    }
  } catch {
    if (lastGoodStatus) statusEl.textContent = `${lastGoodStatus} · (újracsatlakozás…)`;
  }
}

(async function init() {
  btnDelConv?.addEventListener('click', () => deleteSelectedConversation());
  try {
    await refreshStatus();
    await loadConversations();
    await loadTemplates();
    await refreshChartMeta();
  } catch (e) {
    statusEl.textContent = e.message;
  }
  setInterval(tick, 4000);
})();
