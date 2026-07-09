// Másold ki az EGÉSZET (Ctrl+A) → willhaben autólista → F12 → Console → Ctrl+V → Enter
(function () {
  'use strict';

  if (window.__WH_WATCHER__) return;
  window.__WH_WATCHER__ = true;

  const STORAGE_KEY = 'wh-watcher-v2';
  const DEFAULT_INTERVAL_MS = 10_000;

  const DEFAULT_CONFIG = {
    enabled: true,
    intervalSec: 10,
    messageTemplate:
      'Guten Tag! Ich interessiere mich für Ihr Fahrzeug „{title}“ ({price}, {location}). Ist es noch verfügbar? Vielen Dank!',
    maxTotal: 30,
    maxPerDay: 10,
    maxDays: 7,
    startedAt: null,
    sendDelayMs: 3000,
    playSound: true,
    panelOpen: true,
  };

  /** @type {{ markerAdId: string|null, totalSent: number, sentToday: number, sentDate: string, sentAdIds: string[], queue: object[], processing: boolean, lastCheck: string|null, lastError: string|null }} */
  let state = loadState();

  let pollTimer = null;
  let panelEl = null;
  let launcherEl = null;
  let iframeEl = null;

  // ——— storage (Tampermonkey + fallback localStorage) ———

  function storageGet(key, fallback) {
    try {
      if (typeof GM_getValue === 'function') {
        const v = GM_getValue(key, undefined);
        if (v !== undefined) return v;
      }
    } catch (_) {}
    try {
      const raw = localStorage.getItem(key);
      if (raw != null) return JSON.parse(raw);
    } catch (_) {}
    return fallback;
  }

  function storageSet(key, value) {
    try {
      if (typeof GM_setValue === 'function') GM_setValue(key, value);
    } catch (_) {}
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (_) {}
  }

  function loadState() {
    const saved = storageGet(STORAGE_KEY, {});
    return {
      config: { ...DEFAULT_CONFIG, ...(saved.config || {}) },
      markerAdId: saved.markerAdId ?? null,
      totalSent: saved.totalSent ?? 0,
      sentToday: saved.sentToday ?? 0,
      sentDate: saved.sentDate ?? todayKey(),
      sentAdIds: Array.isArray(saved.sentAdIds) ? saved.sentAdIds : [],
      queue: Array.isArray(saved.queue) ? saved.queue : [],
      processing: false,
      lastCheck: saved.lastCheck ?? null,
      lastError: saved.lastError ?? null,
      calibrated: saved.calibrated ?? false,
      listTopId: saved.listTopId ?? null,
    };
  }

  function saveState() {
    storageSet(STORAGE_KEY, {
      config: state.config,
      markerAdId: state.markerAdId,
      totalSent: state.totalSent,
      sentToday: state.sentToday,
      sentDate: state.sentDate,
      sentAdIds: state.sentAdIds.slice(-200),
      queue: state.queue,
      lastCheck: state.lastCheck,
      lastError: state.lastError,
      calibrated: state.calibrated,
      listTopId: state.listTopId,
    });
    renderPanel();
  }

  function todayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  function resetDailyCounterIfNeeded() {
    const t = todayKey();
    if (state.sentDate !== t) {
      state.sentDate = t;
      state.sentToday = 0;
    }
  }

  // ——— ad detection ———

  function extractAdList(data) {
    const pp = data?.props?.pageProps;
    if (!pp) return null;
    const sr = pp.searchResult || pp.initialSearchResult;
    const list = sr?.advertSummaryList?.advertSummary;
    if (!Array.isArray(list)) return null;
    return list;
  }

  function parseAdsFromHtml(html) {
    const m = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (!m) return null;
    try {
      const data = JSON.parse(m[1]);
      const list = extractAdList(data);
      if (!list || list.length === 0) return [];
      return list.map((ad) => {
        const attrs = {};
        for (const a of ad.attributes?.attribute || []) {
          if (a.name && a.values?.[0] != null) attrs[a.name] = a.values[0];
        }
        const seo = attrs.SEO_URL || '';
        const url = seo.startsWith('http')
          ? seo
          : `https://www.willhaben.at/iad/${seo.replace(/^\//, '')}`;
        return {
          id: String(ad.id || attrs.ADID || ''),
          title: attrs.HEADING || ad.description || 'Anzeige',
          price: attrs['PRICE_FOR_DISPLAY'] || attrs.PRICE || '',
          location: attrs.LOCATION || '',
          url,
        };
      }).filter((a) => a.id);
    } catch (e) {
      return null;
    }
  }

  function parseAdsFromLivePage() {
    const script = document.getElementById('__NEXT_DATA__');
    if (!script?.textContent) return null;
    return parseAdsFromHtml(
      `<script id="__NEXT_DATA__">${script.textContent}</script>`
    );
  }

  function findNewAds(ads) {
    if (!ads.length) return [];

    if (!state.calibrated || !state.markerAdId) {
      state.markerAdId = ads[0].id;
      state.calibrated = true;
      log(`Kalibrálás: referencia = ${state.markerAdId} (első futás, nincs küldés)`);
      saveState();
      return [];
    }

    const markerIndex = ads.findIndex((a) => a.id === state.markerAdId);
    if (markerIndex === -1) {
      // A régi referencia lecsúszott a listáról — újrakalibrálás spam nélkül.
      state.markerAdId = ads[0].id;
      log('Referencia nincs a listában → újrakalibrálás, küldés nélkül');
      saveState();
      return [];
    }

    if (markerIndex === 0) return [];

    const fresh = ads.slice(0, markerIndex).filter((a) => !state.sentAdIds.includes(a.id));
    return fresh;
  }

  // ——— limits ———

  function getLimitStatus() {
    resetDailyCounterIfNeeded();
    const cfg = state.config;
    const now = Date.now();

    if (cfg.startedAt) {
      const maxMs = cfg.maxDays * 24 * 60 * 60 * 1000;
      if (now - cfg.startedAt > maxMs) {
        return { ok: false, reason: `Lejárt (${cfg.maxDays} nap)` };
      }
    }

    if (state.totalSent >= cfg.maxTotal) {
      return { ok: false, reason: `Összes limit (${cfg.maxTotal})` };
    }

    if (state.sentToday >= cfg.maxPerDay) {
      return { ok: false, reason: `Napi limit (${cfg.maxPerDay})` };
    }

    return { ok: true, reason: '' };
  }

  function formatMessage(ad) {
    const tpl = state.config.messageTemplate || DEFAULT_CONFIG.messageTemplate;
    return tpl
      .replaceAll('{title}', ad.title)
      .replaceAll('{price}', ad.price)
      .replaceAll('{location}', ad.location)
      .replaceAll('{url}', ad.url)
      .replaceAll('{id}', ad.id);
  }

  // ——— messaging via hidden iframe (same origin, bejelentkezett session) ———

  function setReactInputValue(el, value) {
    const proto =
      el instanceof HTMLTextAreaElement
        ? HTMLTextAreaElement.prototype
        : HTMLInputElement.prototype;
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc?.set) desc.set.call(el, value);
    else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function waitFor(fn, timeoutMs = 12_000, stepMs = 200) {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const tick = () => {
        try {
          const result = fn();
          if (result) return resolve(result);
        } catch (_) {}
        if (Date.now() - start > timeoutMs) return reject(new Error('Timeout'));
        setTimeout(tick, stepMs);
      };
      tick();
    });
  }

  async function sendMessageToAd(ad) {
    if (!iframeEl) {
      iframeEl = document.createElement('iframe');
      iframeEl.setAttribute('aria-hidden', 'true');
      iframeEl.style.cssText =
        'position:fixed;left:-9999px;top:0;width:420px;height:720px;opacity:0;pointer-events:none;border:0;';
      document.body.appendChild(iframeEl);
    }

    const loadUrl = ad.url;
    await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Iframe load timeout')), 20_000);
      iframeEl.onload = () => {
        clearTimeout(t);
        resolve();
      };
      iframeEl.src = loadUrl;
    });

    const doc = iframeEl.contentDocument;
    if (!doc) throw new Error('Iframe dokumentum nem elérhető');

    const textarea = await waitFor(
      () => doc.querySelector('[data-testid="mailContent-input"]'),
      15_000
    );

    const msg = formatMessage(ad);
    setReactInputValue(textarea, msg);
    textarea.focus();

    const sendBtn = await waitFor(
      () =>
        doc.querySelector('[data-testid="ad-request-send-message"]') ||
        Array.from(doc.querySelectorAll('button')).find((b) =>
          /nachricht absenden/i.test(b.textContent || '')
        ),
      8_000
    );

    sendBtn.click();
    await new Promise((r) => setTimeout(r, state.config.sendDelayMs));

    return true;
  }

  async function processQueue() {
    if (state.processing) return;
    state.processing = true;

    while (state.queue.length > 0) {
      const limit = getLimitStatus();
      if (!limit.ok) {
        state.config.enabled = false;
        state.lastError = limit.reason;
        log(`Leállítva: ${limit.reason}`);
        saveState();
        break;
      }

      const ad = state.queue.shift();
      try {
        await sendMessageToAd(ad);
        state.totalSent += 1;
        state.sentToday += 1;
        state.sentAdIds.push(ad.id);
        state.lastError = null;
        log(`✓ Üzenet elküldve: ${ad.title} (${ad.id})`);
        notify(`Üzenet elküldve: ${ad.title}`);
        if (state.config.playSound) beep();
      } catch (err) {
        state.lastError = String(err?.message || err);
        log(`✗ Hiba (${ad.id}): ${state.lastError}`);
        // Vissza a sor elejére, később újra
        state.queue.unshift(ad);
        await new Promise((r) => setTimeout(r, 5000));
        break;
      }
      saveState();
      await new Promise((r) => setTimeout(r, 1500));
    }

    if (state.queue.length === 0 && state.listTopId) {
      state.markerAdId = state.listTopId;
    }

    state.processing = false;
    saveState();
  }

  // ——— polling ———

  async function fetchSearchPageAds() {
    const url = location.href;
    const res = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      headers: { Accept: 'text/html' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const ads = parseAdsFromHtml(html);
    if (ads == null) throw new Error('Nem található __NEXT_DATA__ (keresési oldal?)');
    return ads;
  }

  function isSearchResultsPage() {
    const ads = parseAdsFromLivePage();
    if (ads?.length) return true;
    return false;
  }

  function getPageHint() {
    if (/\/iad\/gebrauchtwagen\/?$/.test(location.pathname)) {
      return 'Ez a gépkocsi főoldal — kattints a keresésre / szűrőre, hogy megjelenjenek az autók listája (pl. …/gebrauchtwagenboerse)';
    }
    if (/\/iad\//.test(location.pathname) && !/\/d\//.test(location.pathname)) {
      return 'Nincs hirdetéslista ezen az oldalon — nyisd meg a találati listát (ahol az autók sorban látszanak)';
    }
    return 'Nyisd meg a willhaben keresési találati listát (/iad/…)';
  }

  async function tick() {
    if (!state.config.enabled) return;
    if (!isSearchResultsPage()) {
      state.lastError = getPageHint();
      saveState();
      return;
    }

    const limit = getLimitStatus();
    if (!limit.ok) {
      state.config.enabled = false;
      state.lastError = limit.reason;
      saveState();
      return;
    }

    try {
      let ads = parseAdsFromLivePage();
      if (!ads?.length) ads = await fetchSearchPageAds();

      state.lastCheck = new Date().toLocaleTimeString('de-AT');
      if (ads[0]?.id) state.listTopId = ads[0].id;
      const newAds = findNewAds(ads);

      if (newAds.length) {
        for (const ad of newAds) {
          if (!state.queue.some((q) => q.id === ad.id)) state.queue.push(ad);
        }
        log(`${newAds.length} új hirdetés → sorban: ${state.queue.length}`);
        saveState();
        processQueue();
      } else if (ads.length) {
        if (!state.processing && state.queue.length === 0) {
          state.markerAdId = ads[0].id;
        }
        state.lastError = null;
        saveState();
      }
    } catch (err) {
      state.lastError = String(err?.message || err);
      saveState();
    }
  }

  function startPolling() {
    stopPolling();
    if (!state.config.enabled) return;
    if (!state.config.startedAt) state.config.startedAt = Date.now();
    const ms = Math.max(5, state.config.intervalSec) * 1000;
    tick();
    pollTimer = setInterval(tick, ms);
  }

  function stopPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = null;
  }

  // ——— UI ———

  function log(msg) {
    console.log('[WH-Watcher]', msg);
    const el = panelEl?.querySelector('.wh-log');
    if (el) {
      const line = document.createElement('div');
      line.textContent = `${new Date().toLocaleTimeString('de-AT')} ${msg}`;
      el.prepend(line);
      while (el.children.length > 30) el.lastChild?.remove();
    }
  }

  function notify(text) {
    try {
      if (typeof GM_notification === 'function') {
        GM_notification({ text, title: 'Willhaben Watcher', timeout: 4000 });
        return;
      }
    } catch (_) {}
    if (Notification?.permission === 'granted') {
      new Notification('Willhaben Watcher', { body: text });
    }
  }

  function beep() {
    try {
      const ctx = new AudioContext();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.frequency.value = 880;
      g.gain.value = 0.05;
      o.start();
      setTimeout(() => {
        o.stop();
        ctx.close();
      }, 120);
    } catch (_) {}
  }

  function renderPanel() {
    if (!panelEl) return;
    const cfg = state.config;
    const limit = getLimitStatus();

    panelEl.querySelector('.wh-status').textContent = cfg.enabled
      ? limit.ok
        ? '● Fut'
        : `● Leállítva: ${limit.reason}`
      : '○ Szünet';

    panelEl.querySelector('.wh-stats').innerHTML = [
      `Referencia ID: <b>${state.markerAdId || '—'}</b>`,
      `Ma: ${state.sentToday}/${cfg.maxPerDay} · Összes: ${state.totalSent}/${cfg.maxTotal}`,
      `Napok: ${cfg.maxDays} · Intervallum: ${cfg.intervalSec}s`,
      `Sor: ${state.queue.length} · Utolsó ell.: ${state.lastCheck || '—'}`,
      state.lastError ? `<span class="wh-err">${state.lastError}</span>` : '',
    ].join('<br>');

    const enabledToggle = panelEl.querySelector('.wh-enabled');
    if (enabledToggle) enabledToggle.checked = cfg.enabled;
  }

  function mountRoot() {
    return document.body || document.documentElement;
  }

  function buildLauncher() {
    if (launcherEl && document.contains(launcherEl)) return;
    if (launcherEl) launcherEl.remove();

    launcherEl = document.createElement('button');
    launcherEl.id = 'wh-watcher-launcher';
    launcherEl.type = 'button';
    launcherEl.title = 'Willhaben Watcher — kattints a panelhez';
    launcherEl.textContent = 'WH';
    launcherEl.setAttribute('data-wh-watcher', '1');
    launcherEl.style.cssText =
      'position:fixed!important;bottom:24px!important;right:24px!important;z-index:2147483647!important;' +
      'width:56px!important;height:56px!important;border-radius:50%!important;border:3px solid #fff!important;' +
      'background:#0a7!important;color:#fff!important;font:700 18px/56px system-ui,sans-serif!important;' +
      'cursor:pointer!important;box-shadow:0 6px 24px rgba(0,0,0,.45)!important;padding:0!important;' +
      'margin:0!important;display:block!important;visibility:visible!important;opacity:1!important;';
    launcherEl.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!panelEl) buildPanel();
      else panelEl.style.display = panelEl.style.display === 'none' ? '' : 'none';
    });
    mountRoot().appendChild(launcherEl);
  }

  function buildPanel() {
    if (panelEl) {
      panelEl.style.display = '';
      return;
    }

    const style = document.createElement('style');
    style.textContent = `
      #wh-watcher-panel{position:fixed;bottom:16px;right:16px;z-index:2147483646;width:min(380px,calc(100vw - 24px));
        font:13px/1.4 system-ui,sans-serif;color:#111;background:#fff;border:1px solid #ccc;border-radius:10px;
        box-shadow:0 8px 28px rgba(0,0,0,.18);overflow:hidden}
      #wh-watcher-panel header{display:flex;align-items:center;justify-content:space-between;padding:8px 10px;
        background:#f5f5f5;border-bottom:1px solid #e0e0e0;cursor:move;user-select:none}
      #wh-watcher-panel .wh-body{padding:10px;max-height:60vh;overflow:auto}
      #wh-watcher-panel label{display:block;margin:6px 0 2px;font-weight:600}
      #wh-watcher-panel input[type=text],#wh-watcher-panel input[type=number],#wh-watcher-panel textarea{
        width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid #ccc;border-radius:6px}
      #wh-watcher-panel textarea{min-height:72px;resize:vertical}
      #wh-watcher-panel .wh-row{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px}
      #wh-watcher-panel .wh-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
      #wh-watcher-panel button{padding:6px 10px;border:1px solid #bbb;border-radius:6px;background:#fafafa;cursor:pointer}
      #wh-watcher-panel button.primary{background:#0a7;color:#fff;border-color:#086}
      #wh-watcher-panel .wh-log{margin-top:8px;max-height:120px;overflow:auto;font-size:11px;background:#f9f9f9;
        border:1px solid #eee;border-radius:6px;padding:6px}
      #wh-watcher-panel .wh-err{color:#b00}
      #wh-watcher-panel .wh-mini{font-size:11px;color:#666;margin-top:4px}
    `;
    document.head.appendChild(style);

    panelEl = document.createElement('div');
    panelEl.id = 'wh-watcher-panel';
    panelEl.innerHTML = `
      <header><strong>Willhaben Watcher</strong><span class="wh-status">○ Szünet</span></header>
      <div class="wh-body">
        <label><input type="checkbox" class="wh-enabled" /> Automatikus figyelés</label>
        <div class="wh-stats wh-mini"></div>
        <label>Sablon üzenet ({title}, {price}, {location}, {url}, {id})</label>
        <textarea class="wh-template"></textarea>
        <div class="wh-row">
          <div><label>Össz. max</label><input class="wh-max-total" type="number" min="1" /></div>
          <div><label>Napi max</label><input class="wh-max-day" type="number" min="1" /></div>
          <div><label>Max nap</label><input class="wh-max-days" type="number" min="1" /></div>
        </div>
        <div class="wh-row">
          <div><label>Intervallum (mp)</label><input class="wh-interval" type="number" min="5" /></div>
          <div><label><input type="checkbox" class="wh-sound" /> Hang</label></div>
        </div>
        <div class="wh-actions">
          <button type="button" class="primary wh-save">Mentés</button>
          <button type="button" class="wh-calibrate">Újrakalibrálás</button>
          <button type="button" class="wh-reset">Stat reset</button>
        </div>
        <div class="wh-log"></div>
        <p class="wh-mini">Gebrauchtwagen: lista oldal kell (autók sorban). Első körben kalibrál — nem küld. Bejelentkezés kötelező!</p>
      </div>
    `;
    document.body.appendChild(panelEl);

    const cfg = state.config;
    panelEl.querySelector('.wh-template').value = cfg.messageTemplate;
    panelEl.querySelector('.wh-max-total').value = cfg.maxTotal;
    panelEl.querySelector('.wh-max-day').value = cfg.maxPerDay;
    panelEl.querySelector('.wh-max-days').value = cfg.maxDays;
    panelEl.querySelector('.wh-interval').value = cfg.intervalSec;
    panelEl.querySelector('.wh-sound').checked = cfg.playSound;

    panelEl.querySelector('.wh-enabled').addEventListener('change', (e) => {
      state.config.enabled = e.target.checked;
      if (state.config.enabled) {
        if (Notification?.permission === 'default') Notification.requestPermission();
        startPolling();
      } else {
        stopPolling();
      }
      saveState();
    });

    panelEl.querySelector('.wh-save').addEventListener('click', () => {
      state.config.messageTemplate = panelEl.querySelector('.wh-template').value.trim();
      state.config.maxTotal = Number(panelEl.querySelector('.wh-max-total').value) || 30;
      state.config.maxPerDay = Number(panelEl.querySelector('.wh-max-day').value) || 10;
      state.config.maxDays = Number(panelEl.querySelector('.wh-max-days').value) || 7;
      state.config.intervalSec = Number(panelEl.querySelector('.wh-interval').value) || 10;
      state.config.playSound = panelEl.querySelector('.wh-sound').checked;
      saveState();
      if (state.config.enabled) startPolling();
      log('Beállítások mentve');
    });

    panelEl.querySelector('.wh-calibrate').addEventListener('click', () => {
      state.calibrated = false;
      state.markerAdId = null;
      saveState();
      log('Kalibrálás törölve — következő ellenőrzésnél új referencia');
      tick();
    });

    panelEl.querySelector('.wh-reset').addEventListener('click', () => {
      if (!confirm('Statisztika és sor törlése?')) return;
      state.totalSent = 0;
      state.sentToday = 0;
      state.sentAdIds = [];
      state.queue = [];
      state.config.startedAt = null;
      saveState();
      log('Statisztika nullázva');
    });

    // drag
    const header = panelEl.querySelector('header');
    let drag = null;
    header.addEventListener('mousedown', (e) => {
      drag = { x: e.clientX, y: e.clientY, l: panelEl.offsetLeft, t: panelEl.offsetTop };
      panelEl.style.left = `${panelEl.offsetLeft}px`;
      panelEl.style.top = `${panelEl.offsetTop}px`;
      panelEl.style.right = 'auto';
      panelEl.style.bottom = 'auto';
      panelEl.style.position = 'fixed';
    });
    window.addEventListener('mousemove', (e) => {
      if (!drag) return;
      panelEl.style.left = `${drag.l + e.clientX - drag.x}px`;
      panelEl.style.top = `${drag.t + e.clientY - drag.y}px`;
    });
    window.addEventListener('mouseup', () => {
      drag = null;
    });

    renderPanel();
  }

  // ——— Tampermonkey menu ———

  try {
    if (typeof GM_registerMenuCommand === 'function') {
      GM_registerMenuCommand('Panel megnyitása/elrejtése', () => {
        if (!panelEl) buildPanel();
        else panelEl.style.display = panelEl.style.display === 'none' ? '' : 'none';
      });
      GM_registerMenuCommand('Indítás / szünet', () => {
        state.config.enabled = !state.config.enabled;
        if (state.config.enabled) startPolling();
        else stopPolling();
        saveState();
      });
    }
  } catch (_) {}

  // ——— init ———

  function ensureUi() {
    try {
      buildLauncher();
      buildPanel();
    } catch (err) {
      console.error('[WH-Watcher] UI hiba:', err);
      if (launcherEl) launcherEl.style.background = '#c00';
    }
  }

  function init() {
    ensureUi();
    if (state.config.panelOpen !== false && panelEl) {
      panelEl.style.display = '';
    }
    if (state.config.enabled) startPolling();
    if (state.queue.length) processQueue();
    if (!init.done) {
      init.done = true;
      log('Willhaben Watcher v1.3 — automatikus figyelés BE');
      console.info('[WH-Watcher] v1.3 AKTÍV:', location.href);
    }
  }
  init.done = false;

  function boot() {
    const tryBoot = () => {
      if (!mountRoot()) return;
      init();
    };
    tryBoot();
    let n = 0;
    const iv = setInterval(() => {
      n += 1;
      if (!launcherEl || !document.contains(launcherEl)) ensureUi();
      if (n >= 60) clearInterval(iv);
    }, 1000);
    window.addEventListener('popstate', () => setTimeout(ensureUi, 500));
    const push = history.pushState;
    history.pushState = function (...args) {
      push.apply(this, args);
      setTimeout(ensureUi, 500);
    };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
