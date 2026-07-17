import path from 'path';
import { getInstanceDir, loadConfig, resolveAdminPort } from './config.mjs';
import { loadState, saveState, appendLog, todayKey } from './state.mjs';
import { fetchListings, findNewAds, mergeSeenIds } from './parse.mjs';
import { getPhoneForAd } from './phone.mjs';
import { sendSms } from './sms.mjs';
import { startAdminServer, setMonitorControl, setAppShutdown } from './admin-server.mjs';
import { acquireInstanceLock, releaseInstanceLock } from './instance-lock.mjs';
import { setupConsentHandler, dismissConsent } from './consent.mjs';
import { launchBrowser } from './browser.mjs';

process.title = 'mobilede-pro';

const PROFILE_DIR = path.join(getInstanceDir(), 'browser-profile');

class Monitor {
  constructor() {
    this.running = false;
    this.timer = null;
    this.context = null;
    this.page = null;
    this.processing = false;
    this.tickInProgress = false;
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
    await dismissConsent(this.page);
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
      return { ok: false, reason: 'Admin: küldés kikapcsolva' };
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
    if (/ETIMEDOUT|ECONNRESET|ENOTFOUND|timeout/i.test(msg)) {
      return 'Hálózati timeout — mobile.de nem válaszolt (később újra próbálja)';
    }
    if (msg.length > 220) return `${msg.slice(0, 220)}…`;
    return msg;
  }

  async tick() {
    if (!this.running || this.tickInProgress) return;
    this.tickInProgress = true;

    try {
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
      const prefixes = config.allowedPrefixes || ['15', '16', '17'];

      for (const watch of config.watchUrls.filter((w) => w.enabled && w.url)) {
        try {
          const ads = await fetchListings(this.page, watch.url);
          const marker = state.urlMarkers[watch.id];
          const calibrated = state.urlCalibrated[watch.id];
          state.urlSeenIds = state.urlSeenIds || {};
          let seenIds = state.urlSeenIds[watch.id] || [];
          if (calibrated && !seenIds.length && ads.length) {
            seenIds = ads.map((a) => a.id);
            state.urlSeenIds[watch.id] = seenIds;
          }
          const result = findNewAds(ads, marker, calibrated, seenIds);

          state.urlSeenIds[watch.id] = result.seenIds || seenIds;
          if (result.action === 'calibrate') {
            state.urlMarkers[watch.id] = result.newMarker;
            state.urlCalibrated[watch.id] = true;
            appendLog(
              state,
              'info',
              `[${watch.label}] Kalibrálás → ${result.seenIds?.length || ads.length} hirdetés megjelölve`
            );
            saveState(state);
            continue;
          }

          if (result.action === 'none' || result.action === 'empty') {
            appendLog(state, 'info', `[${watch.label}] Ellenőrizve — ${ads.length} hirdetés, nincs új`);
            saveState(state);
            continue;
          }

          const fresh = (result.newAds || []).filter((a) => !state.sentAdIds.includes(a.id));
          if (!fresh.length) {
            appendLog(state, 'info', `[${watch.label}] Ellenőrizve — ${ads.length} hirdetés, nincs új`);
            saveState(state);
            continue;
          }

          for (const ad of fresh) {
            const lim = this.getLimitStatus(config, state);
            if (!lim.ok) break;

            if (!ad.isPrivate) {
              appendLog(state, 'info', `[${watch.label}] Kihagyva (Händler): ${ad.title}`);
              state.urlMarkers[watch.id] = result.newMarker;
              state.urlSeenIds[watch.id] = mergeSeenIds(state.urlSeenIds[watch.id], [ad.id]);
              saveState(state);
              continue;
            }

            this.processing = true;
            try {
              const phoneResult = await getPhoneForAd(this.page, ad.url, prefixes);
              if (!phoneResult.ok) {
                appendLog(
                  state,
                  'info',
                  `[${watch.label}] Kihagyva ${ad.id}: ${phoneResult.reason}`
                );
                state.urlMarkers[watch.id] = result.newMarker;
                state.urlSeenIds[watch.id] = mergeSeenIds(state.urlSeenIds[watch.id], [ad.id]);
                saveState(state);
                continue;
              }

              const smsResult = await sendSms(
                config,
                { ...ad, phone: phoneResult.phone },
                config.messageTemplate
              );

              state.totalSent += 1;
              state.sentToday += 1;
              state.sentAdIds.push(ad.id);
              state.urlMarkers[watch.id] = result.newMarker;
              state.urlSeenIds[watch.id] = mergeSeenIds(state.urlSeenIds[watch.id], [ad.id]);

              const mode = smsResult.dryRun ? 'DRY-RUN SMS' : 'SMS elküldve';
              appendLog(
                state,
                'ok',
                `[${watch.label}] ${mode} → ${phoneResult.phone}: ${ad.title}`
              );
            } catch (err) {
              if (this.isBrowserClosedError(err)) {
                await this.resetBrowser(
                  state,
                  'Böngésző bezárva — SMS szünetel. Hagyd nyitva a Chrome-ot, vagy: npm start'
                );
              } else {
                appendLog(state, 'error', `[${watch.label}] Hiba ${ad.id}: ${this.formatError(err)}`);
              }
              break;
            } finally {
              this.processing = false;
              saveState(state);
              await new Promise((r) => setTimeout(r, config.sendDelayMs || 5000));
            }
          }
        } catch (err) {
          if (this.isBrowserClosedError(err)) {
            await this.resetBrowser(
              state,
              'Böngésző bezárva — figyelés folytatódik, SMS csak nyitott böngészővel'
            );
          } else {
            appendLog(state, 'error', `[${watch.label}] ${this.formatError(err)}`);
          }
          saveState(state);
        }
      }
      saveState(state);
    } finally {
      this.tickInProgress = false;
    }
  }

  start() {
    if (this.running) return;
    this.running = true;
    const config = loadConfig();
    const ms = Math.max(10, config.pollIntervalSeconds) * 1000;
    this.tick();
    this.timer = setInterval(() => this.tick(), ms);
    const state = loadState();
    appendLog(state, 'info', 'Figyelés elindítva (mobile.de FSBO + SMS +49 15/16/17)');
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
    state.urlSeenIds = {};
    appendLog(state, 'info', 'Összes URL újrakalibrálva');
    saveState(state);
  }

  resetStats() {
    const state = loadState();
    state.totalSent = 0;
    state.sentToday = 0;
    state.sentAdIds = [];
    state.startedAt = null;
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
  const port = resolveAdminPort(config);
  console.error(
    `\n  Mobile.de Pro már fut (PID ${lock.existingPid}).\n` +
      `  Admin panel: http://127.0.0.1:${port}\n` +
      `  Leállítás: npm run stop\n`
  );
  process.exit(1);
}

const config = loadConfig();
const adminPort = resolveAdminPort(config);

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
