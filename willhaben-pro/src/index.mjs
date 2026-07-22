import path from 'path';
import { getRoot, loadConfig } from './config.mjs';
import { loadState, saveState, appendLog, todayKey } from './state.mjs';
import { parseAdsFromHtml, findNewAds } from './parse.mjs';
import { sendMessage } from './message.mjs';
import { startAdminServer, setMonitorControl, setAppShutdown } from './admin-server.mjs';
import { acquireInstanceLock, releaseInstanceLock } from './instance-lock.mjs';
import { setupConsentHandler } from './consent.mjs';
import { launchBrowser } from './browser.mjs';

process.title = 'willhaben-pro';

const PROFILE_DIR = path.join(getRoot(), 'data', 'browser-profile');

class Monitor {
  constructor() {
    this.running = false;
    this.timer = null;
    this.context = null;
    this.page = null;
    this.processing = false;
    this.lastBrowserWarnAt = 0;
  }

  isRunning() {
    return this.running;
  }

  isBrowserClosedError(err) {
    const msg = err?.message || '';
    return /has been closed|target.*closed|context.*closed/i.test(msg);
  }

  async resetBrowser(state, message) {
    if (this.context) {
      try {
        await this.context.close();
      } catch {
        /* already closed */
      }
    }
    this.context = null;
    this.page = null;
    const now = Date.now();
    if (message && now - this.lastBrowserWarnAt > 60000) {
      this.lastBrowserWarnAt = now;
      appendLog(state, 'error', message);
      saveState(state);
    }
  }

  isBrowserAlive() {
    if (!this.context || !this.page) return false;
    try {
      return !this.page.isClosed() && this.context.browser()?.isConnected();
    } catch {
      return false;
    }
  }

  async ensureBrowser(state) {
    if (this.isBrowserAlive()) return;

    if (this.context) {
      await this.resetBrowser(state, null);
    }

    const config = loadConfig();
    const { context, browserName } = await launchBrowser(PROFILE_DIR, {
      headless: config.headless === true,
    });
    this.context = context;
    this.context.on('close', () => {
      this.context = null;
      this.page = null;
    });
    this.page = this.context.pages()[0] || (await this.context.newPage());
    setupConsentHandler(this.page);
    appendLog(
      state,
      'info',
      `${browserName} megnyitva — futás közben NE zárd be a böngészőablakot!`
    );
    saveState(state);
  }

  getLimitStatus(config, state) {
    const t = todayKey();
    if (state.sentDate !== t) {
      state.sentDate = t;
      state.sentToday = 0;
    }

    if (!config.admin.enabled) {
      return { ok: false, reason: 'Admin: kikapcsolva' };
    }

    if (!state.startedAt) state.startedAt = Date.now();

    const maxMs = config.admin.maxDays * 86400000;
    if (Date.now() - state.startedAt > maxMs) {
      return { ok: false, reason: `Lejárt (${config.admin.maxDays} nap)` };
    }
    if (state.totalSent >= config.admin.maxTotal) {
      return { ok: false, reason: `Összes limit (${config.admin.maxTotal})` };
    }
    if (state.sentToday >= config.admin.maxPerDay) {
      return { ok: false, reason: `Napi limit (${config.admin.maxPerDay})` };
    }
    return { ok: true };
  }

  formatError(err) {
    let msg = err?.message || String(err);
    if (msg.includes('Call log')) msg = msg.split('Call log')[0].trim();
    if (/HTTP 429|\b429\b/.test(msg)) {
      return (
        'Túl gyakori lekérdezés (HTTP 429) — Willhaben limit. ' +
        '■ Leállítás → várj 5–10 perc → ellenőrzés min. 30 mp → Mentés → ↻ Újraindítás'
      );
    }
    if (/ETIMEDOUT|ECONNRESET|ENOTFOUND/i.test(msg)) {
      return 'Hálózati timeout — willhaben nem válaszolt (később újra próbálja)';
    }
    if (msg.length > 200) return `${msg.slice(0, 200)}…`;
    return msg;
  }

  async fetchAds(page, url) {
    const maxAttempts = 3;
    let lastErr;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const res = await page.request.get(url, {
          headers: { Accept: 'text/html', 'User-Agent': 'Mozilla/5.0' },
          timeout: 45000,
        });
        const status = res.status();
        if (status === 429) throw new Error('HTTP 429');
        if (!res.ok()) throw new Error(`HTTP ${status}`);
        const html = await res.text();
        const ads = parseAdsFromHtml(html);
        if (!ads) throw new Error('Nincs hirdetéslista (__NEXT_DATA__)');
        return ads;
      } catch (err) {
        lastErr = err;
        const msg = err?.message || '';
        const is429 = /HTTP 429|\b429\b/.test(msg);
        const retryable = is429 || /ETIMEDOUT|ECONNRESET|timeout|Timeout/i.test(msg);
        if (attempt < maxAttempts && retryable) {
          const delay = is429 ? 60000 * attempt : 4000 * attempt;
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        throw err;
      }
    }
    throw lastErr;
  }

  async tick() {
    if (!this.running || this.processing) return;

    const config = loadConfig();
    const state = loadState();
    const limit = this.getLimitStatus(config, state);
    if (!limit.ok) {
      appendLog(state, 'error', `Leállítva: ${limit.reason}`);
      saveState(state);
      this.stop();
      return;
    }

    await this.ensureBrowser(state);

    for (const watch of config.watchUrls.filter((w) => w.enabled && w.url)) {
      try {
        const ads = await this.fetchAds(this.page, watch.url);
        const marker = state.urlMarkers[watch.id];
        const calibrated = state.urlCalibrated[watch.id];
        const result = findNewAds(ads, marker, calibrated);

        if (result.action === 'calibrate' || result.action === 'recalibrate') {
          state.urlMarkers[watch.id] = result.newMarker;
          state.urlCalibrated[watch.id] = true;
          appendLog(
            state,
            'info',
            `[${watch.label}] Kalibrálás → referencia ${result.newMarker}`
          );
          saveState(state);
          continue;
        }

        const fresh = result.newAds.filter((a) => !state.sentAdIds.includes(a.id));
        if (!fresh.length) continue;

        for (const ad of fresh) {
          const lim = this.getLimitStatus(config, state);
          if (!lim.ok) break;

          this.processing = true;
          try {
            await sendMessage(this.page, ad, config.messageTemplate, config.sendDelayMs);
            state.totalSent += 1;
            state.sentToday += 1;
            state.sentAdIds.push(ad.id);
            state.urlMarkers[watch.id] = result.newMarker;
            appendLog(state, 'ok', `[${watch.label}] Üzenet elküldve: ${ad.title} → ${ad.url}`);
          } catch (err) {
            if (this.isBrowserClosedError(err)) {
              await this.resetBrowser(
                state,
                'Böngésző bezárva — üzenetküldés szünetel. Hagyd nyitva a Chrome-ot, vagy: npm start'
              );
            } else {
              appendLog(state, 'error', `[${watch.label}] Hiba ${ad.id}: ${this.formatError(err)}`);
            }
            break;
          } finally {
            this.processing = false;
            saveState(state);
          }
        }
      } catch (err) {
        if (this.isBrowserClosedError(err)) {
          await this.resetBrowser(
            state,
            'Böngésző bezárva — figyelés folytatódik, de üzenet csak nyitott böngészővel megy ki'
          );
        } else {
          appendLog(state, 'error', `[${watch.label}] ${this.formatError(err)}`);
        }
        saveState(state);
      }
    }
    saveState(state);
  }

  start() {
    if (this.running) return;
    this.running = true;
    const config = loadConfig();
    const ms = Math.max(5, config.pollIntervalSeconds) * 1000;
    this.tick();
    this.timer = setInterval(() => this.tick(), ms);
    const state = loadState();
    appendLog(state, 'info', 'Figyelés elindítva');
    saveState(state);
  }

  stop() {
    this.running = false;
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    const state = loadState();
    appendLog(state, 'info', 'Figyelés leállítva');
    saveState(state);
  }

  recalibrate() {
    const state = loadState();
    state.urlMarkers = {};
    state.urlCalibrated = {};
    appendLog(state, 'info', 'Összes URL újrakalibrálva');
    saveState(state);
  }

  resetStats() {
    const state = loadState();
    state.totalSent = 0;
    state.sentToday = 0;
    state.sentAdIds = [];
    state.startedAt = null;
    state.queue = [];
    appendLog(state, 'info', 'Statisztika nullázva');
    saveState(state);
  }

  async close() {
    this.stop();
    if (this.context) {
      try {
        await this.context.close();
      } catch {
        /* already closed */
      }
    }
    this.context = null;
    this.page = null;
  }
}

const monitor = new Monitor();
setMonitorControl(monitor);

async function shutdown() {
  const state = loadState();
  appendLog(state, 'info', 'Admin: program leállítva (STOP)');
  saveState(state);
  await monitor.close();
  releaseInstanceLock();
  process.exit(0);
}

setAppShutdown(shutdown);

const lock = acquireInstanceLock();
if (!lock.ok) {
  const config = loadConfig();
  const port = config.adminPort ?? 3847;
  console.error(
    `\n  Willhaben Pro már fut (PID ${lock.existingPid}).\n` +
      `  Admin panel: http://127.0.0.1:${port}\n` +
      `  Leállítás: npm run stop\n`
  );
  process.exit(1);
}

const config = loadConfig();
const adminPort = config.adminPort ?? 3847;

startAdminServer(adminPort)
  .then(() => {
    monitor.start();
  })
  .catch((err) => {
    console.error(`\n  Hiba: ${err.message}\n`);
    releaseInstanceLock();
    process.exit(1);
  });

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
process.on('exit', releaseInstanceLock);
