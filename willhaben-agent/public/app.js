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
const toast = $('#toast');

let selectedId = null;
let editingTplId = null;
let offerMode = false;
let currentConv = null;

function toastMsg(m, err = false) {
  toast.textContent = m;
  toast.classList.remove('hidden');
  toast.style.borderColor = err ? '#ef4444' : varBorder();
  setTimeout(() => toast.classList.add('hidden'), 3500);
}
function varBorder() { return getComputedStyle(document.documentElement).getPropertyValue('--border'); }

async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function fmtTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return ''; }
}

async function refreshStatus() {
  const s = await api('/api/status');
  const parts = [`v${s.version}`];
  if (s.lastSyncAt) parts.push(`sync: ${fmtTime(s.lastSyncAt)}`);
  if (s.syncRunning) parts.push(s.syncStatus || 'szinkron…');
  else if (s.lastSyncError) parts.push(`⚠ ${s.lastSyncError}`);
  statusEl.textContent = parts.join(' · ');
  btnSync.disabled = s.syncRunning;
}

async function loadConversations() {
  const { conversations } = await api('/api/conversations');
  convList.innerHTML = conversations.length
    ? conversations.map((c) => `
      <button type="button" class="item${c.id === selectedId ? ' active' : ''}" data-id="${esc(c.id)}">
        <span class="name">${esc(c.partnerName)}</span>
        <span class="prev">${esc(c.lastPreview || c.adTitle || '')}</span>
      </button>`).join('')
    : '<p class="muted">Nincs beszélgetés. Frissítsd a bejövő üzeneteket.</p>';
  convList.querySelectorAll('.item[data-id]').forEach((btn) => {
    btn.addEventListener('click', () => openConv(btn.dataset.id));
  });
}

async function openConv(id) {
  selectedId = id;
  // Azonnal ürítsd, hogy ne látszódjon a másik beszélgetés szövege
  msgs.innerHTML = '<p class="muted">Betöltés…</p>';
  tTitle.textContent = '…';
  tAd.textContent = '';
  empty.classList.add('hidden');
  thread.classList.remove('hidden');

  const { conversation: c } = await api(`/api/conversations/${encodeURIComponent(id)}`);
  if (selectedId !== id) return; // közben másikra kattintott
  currentConv = c;
  tTitle.textContent = c.partnerName || '—';
  tAd.textContent = c.adTitle || '';
  const list = c.messages || [];
  msgs.innerHTML = list.length
    ? list.map((m) =>
      `<div class="msg ${m.direction === 'out' ? 'out' : 'in'}">${esc(m.text)}</div>`
    ).join('')
    : '<p class="muted">Nincs üzenet ebben a beszélgetésben. Futtasd újra a szinkront.</p>';
  msgs.scrollTop = msgs.scrollHeight;
  await loadConversations();
}

async function loadTemplates() {
  const { templates } = await api('/api/templates');
  tplPick.innerHTML = templates.map((t) => `<option value="${esc(t.id)}">${esc(t.name)}</option>`).join('');
  tplList.innerHTML = templates.map((t) => `
    <li>
      <span>${esc(t.name)}</span>
      <span>
        <button type="button" class="btn ghost" data-edit="${esc(t.id)}">Szerk</button>
        <button type="button" class="btn ghost" data-del="${esc(t.id)}">Töröl</button>
      </span>
    </li>`).join('');
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
  } catch (e) { toastMsg(e.message, true); }
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
  replyText.value = (replyText.value ? replyText.value + '\n' : '') + text;
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
  } catch (e) { toastMsg(e.message, true); }
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
  } catch (err) { toastMsg(err.message, true); }
  finally { replyForm.querySelector('[type=submit]').disabled = false; }
});

async function tick() {
  try {
    await refreshStatus();
    await loadConversations();
  } catch (e) {
    statusEl.textContent = e.message;
  }
}

(async function init() {
  await refreshStatus();
  await loadConversations();
  await loadTemplates();
  await refreshChartMeta();
  setInterval(tick, 4000);
})();
