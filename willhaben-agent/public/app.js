const $ = (sel) => document.querySelector(sel);

const convList = $('#convList');
const convCount = $('#convCount');
const statusLine = $('#statusLine');
const threadEmpty = $('#threadEmpty');
const threadPanel = $('#threadPanel');
const threadTitle = $('#threadTitle');
const threadAd = $('#threadAd');
const messagesEl = $('#messages');
const replyForm = $('#replyForm');
const replyText = $('#replyText');
const btnSync = $('#btnSync');
const chartFile = $('#chartFile');
const chartMeta = $('#chartMeta');
const chartTable = $('#chartTable');
const chartBody = chartTable.querySelector('tbody');
const btnClearChart = $('#btnClearChart');
const priceHint = $('#priceHint');
const toast = $('#toast');

let selectedId = null;
let pollTimer = null;

function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.classList.toggle('hidden', false);
  toast.style.borderColor = isError ? 'var(--danger)' : 'var(--border)';
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add('hidden'), 3500);
}

async function api(path, opts = {}) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || res.statusText);
  return data;
}

function fmtTime(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString('hu-HU', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function renderConversations(list) {
  convCount.textContent = String(list.length);
  convList.innerHTML = '';
  if (!list.length) {
    convList.innerHTML = '<p class="muted" style="padding:1rem">Nincs beszélgetés. Frissítsd az üzeneteket.</p>';
    return;
  }
  for (const c of list) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `conv-item${c.unread ? ' unread' : ''}${c.id === selectedId ? ' active' : ''}`;
    btn.dataset.id = c.id;
    btn.innerHTML = `
      <span class="name">${escapeHtml(c.partnerName || 'Ismeretlen')}</span>
      <span class="preview">${escapeHtml(c.lastPreview || c.adTitle || '—')}</span>
      <span class="meta">${fmtTime(c.lastMessageAt)} · ${c.messageCount || 0} üzenet</span>
    `;
    btn.addEventListener('click', () => openConversation(c.id));
    convList.appendChild(btn);
  }
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function openConversation(id) {
  selectedId = id;
  const { conversation: c } = await api(`/api/conversations/${encodeURIComponent(id)}`);
  threadEmpty.classList.add('hidden');
  threadPanel.classList.remove('hidden');
  threadTitle.textContent = c.partnerName || 'Beszélgetés';
  threadAd.textContent = c.adTitle || '';
  messagesEl.innerHTML = '';
  for (const m of c.messages || []) {
    const div = document.createElement('div');
    div.className = `msg ${m.direction === 'out' ? 'out' : 'in'}`;
    div.innerHTML = `${escapeHtml(m.text)}<time>${fmtTime(m.at)}</time>`;
    messagesEl.appendChild(div);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
  await refreshConversations();
  await lookupPriceForConversation(c);
}

async function lookupPriceForConversation(c) {
  priceHint.classList.add('hidden');
  const title = `${c.adTitle || ''} ${c.partnerName || ''}`;
  const yearMatch = title.match(/\b(19|20)\d{2}\b/);
  const kmMatch = title.match(/(\d[\d.\s]*)\s*km/i);
  try {
    const { match } = await api('/api/price-chart/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        marke: title.split(' ')[0] || '',
        modell: title,
        baujahr: yearMatch?.[0] || '',
        km: kmMatch ? Number(kmMatch[1].replace(/\D/g, '')) : null,
      }),
    });
    if (match) {
      priceHint.textContent = `Becsült érték: ${match.wertEur?.toLocaleString('hu-HU')} € (${match.marke} ${match.modell})`;
      priceHint.classList.remove('hidden');
    }
  } catch {
    /* no chart */
  }
}

async function refreshStatus() {
  const s = await api('/api/status');
  const parts = [`v${s.version}`];
  if (s.lastSyncAt) parts.push(`Utolsó sync: ${fmtTime(s.lastSyncAt)}`);
  if (s.syncRunning) parts.push(s.syncStatus || 'Szinkron…');
  else if (s.lastSyncError) parts.push(`Hiba: ${s.lastSyncError}`);
  statusLine.textContent = parts.join(' · ');
  btnSync.disabled = s.syncRunning;
  btnSync.textContent = s.syncRunning ? '↻ Frissítés…' : '↻ Üzenetek frissítése';
}

async function refreshConversations() {
  const { conversations } = await api('/api/conversations');
  renderConversations(conversations);
}

function renderChart(chart) {
  if (!chart?.rows?.length) {
    chartMeta.textContent = 'Még nincs feltöltve.';
    chartTable.classList.add('hidden');
    btnClearChart.classList.add('hidden');
    chartBody.innerHTML = '';
    return;
  }
  chartMeta.textContent = `${chart.filename} · ${chart.rowCount} sor · ${fmtTime(chart.uploadedAt)}`;
  chartTable.classList.remove('hidden');
  btnClearChart.classList.remove('hidden');
  chartBody.innerHTML = chart.rows.slice(0, 200).map((r) => `
    <tr>
      <td>${escapeHtml(r.marke)}</td>
      <td>${escapeHtml(r.modell)}</td>
      <td>${escapeHtml(r.baujahr)}</td>
      <td>${r.km != null ? r.km.toLocaleString('hu-HU') : '—'}</td>
      <td>${r.wertEur != null ? r.wertEur.toLocaleString('hu-HU') : '—'}</td>
    </tr>
  `).join('');
}

async function refreshChart() {
  const { priceChart } = await api('/api/price-chart');
  renderChart(priceChart);
}

btnSync.addEventListener('click', async () => {
  try {
    await api('/api/sync', { method: 'POST' });
    showToast('Szinkronizálás elindult…');
  } catch (e) {
    showToast(e.message, true);
  }
});

chartFile.addEventListener('change', async () => {
  const file = chartFile.files?.[0];
  if (!file) return;
  const fd = new FormData();
  fd.append('file', file);
  try {
    const data = await api('/api/price-chart', { method: 'POST', body: fd });
    renderChart(data.priceChart);
    showToast(`Árdiagram feltöltve (${data.priceChart.rowCount} sor)`);
  } catch (e) {
    showToast(e.message, true);
  } finally {
    chartFile.value = '';
  }
});

btnClearChart.addEventListener('click', async () => {
  if (!confirm('Árdiagram törlése?')) return;
  await api('/api/price-chart', { method: 'DELETE' });
  renderChart(null);
  showToast('Árdiagram törölve');
});

replyForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!selectedId) return;
  const text = replyText.value.trim();
  if (!text) return;
  try {
    replyForm.querySelector('button').disabled = true;
    await api(`/api/conversations/${encodeURIComponent(selectedId)}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
    replyText.value = '';
    showToast('Üzenet elküldve');
    await openConversation(selectedId);
  } catch (err) {
    showToast(err.message, true);
  } finally {
    replyForm.querySelector('button').disabled = false;
  }
});

replyText.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    replyForm.requestSubmit();
  }
});

async function tick() {
  try {
    await refreshStatus();
    await refreshConversations();
    if (selectedId) {
      const active = document.querySelector(`.conv-item[data-id="${CSS.escape(selectedId)}"]`);
      if (active) active.classList.add('active');
    }
  } catch (e) {
    statusLine.textContent = `Kapcsolódási hiba: ${e.message}`;
  }
}

async function init() {
  await refreshStatus();
  await refreshConversations();
  await refreshChart();
  pollTimer = setInterval(tick, 4000);
}

init();
