const IMPORT_LIST_KEY = "autosweb-import-list";
const EMBEDDED_VERSION = document.querySelector('meta[name="autosweb-version"]')?.content ?? "";

export function initImportPanel({ onApply, onSelected, alertOnApply = true } = {}) {
  const panel = document.getElementById("import-panel");
  const urlInput = document.getElementById("import-url");
  const startBtn = document.getElementById("import-start-btn");
  const chromeBtn = document.getElementById("import-chrome-btn");
  const logEl = document.getElementById("import-log");
  const resultsEl = document.getElementById("import-results");
  const toggleBtn = document.getElementById("import-toggle-btn");

  if (!panel || !urlInput || !startBtn) return;

  let importing = false;

  toggleBtn?.addEventListener("click", () => {
    panel.classList.toggle("collapsed");
    toggleBtn.textContent = panel.classList.contains("collapsed") ? "Import megnyitása" : "Import összecsukása";
  });

  function appendLog(message) {
    if (!logEl) return;
    logEl.hidden = false;
    const line = document.createElement("div");
    line.className = "import-log-line";
    line.textContent = message;
    logEl.appendChild(line);
    logEl.scrollTop = logEl.scrollHeight;
  }

  function showUpgradeWarning(serverVersion) {
    const msg =
      `Régi autosweb verzió fut (${serverVersion || "?"}). Frissíts:\n\n` +
      "cd ~/bocsa-app && git pull origin main\n" +
      "cd autosweb/mac && ./frissites.command\n\n" +
      "Majd indítsd újra az Autosweb-et és Cmd+Shift+R a böngészőben.";
    appendLog(`⚠ Frissítés szükséges — jelenlegi szerver verzió: ${serverVersion || "?"}`);
    const warn = document.getElementById("import-upgrade-warn");
    if (warn) {
      warn.hidden = false;
      warn.textContent =
        "Régi verzió — futtasd: autosweb/mac/frissites.command, majd indítsd újra az Autosweb-et.";
    }
    console.warn(msg);
  }

  async function checkVersion() {
    try {
      const response = await fetch("/api/health");
      const data = await response.json();
      const serverVersion = data.version ?? "";
      if (EMBEDDED_VERSION && serverVersion && serverVersion !== EMBEDDED_VERSION) {
        appendLog(`⚠ Böngésző cache ≠ szerver (${EMBEDDED_VERSION} vs ${serverVersion}). Cmd+Shift+R.`);
      }
      if (serverVersion && !serverVersion.includes("importdatafix")) {
        showUpgradeWarning(serverVersion);
      }
      try {
        const statsResponse = await fetch("/api/db/stats");
        if (statsResponse.ok) {
          const stats = await statsResponse.json();
          appendLog(`SQLite: ${stats.listings} hirdetés, ${stats.cells} cella`);
        }
      } catch {
        /* db offline */
      }
    } catch {
      /* offline / server down */
    }
  }

  function renderResults(items) {
    if (!resultsEl) return;
    resultsEl.innerHTML = "";
    resultsEl.hidden = items.length === 0;

    for (const [index, item] of items.entries()) {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "import-result-row";
      row.innerHTML = `
        <strong>${escapeHtml(item.cim || "—")}</strong>
        <span>${escapeHtml(item.ar || "—")} · ${escapeHtml(item.km || "—")} · ${escapeHtml(item.evjarat || "—")}</span>
      `;
      row.addEventListener("click", () => {
        onApply?.(item.form, item);
        onSelected?.(item);
        appendLog(`Betöltve: ${item.cim || item.url}`);
        if (!item.form?.km && item.km) {
          appendLog(`⚠ Km a listából: ${item.km} — ellenőrizd a Km. óra állás mezőt`);
        } else if (item.form?.km) {
          appendLog(`Km. óra állás: ${Number(item.form.km).toLocaleString("hu-HU")} km`);
        }
        if (item.importSummaryText) {
          appendLog(item.importSummaryText.replace(/\n/g, " · "));
        }
        if (alertOnApply) {
          const missing = item.missingRequired?.length
            ? `\n\nHiányzó kötelező mezők:\n${item.missingRequired.join("\n")}`
            : "";
          const kmNote = !item.form?.km
            ? "\n\n⚠ Km. óra állás üres — a hirdetésben nem volt olvasható futásteljesítmény."
            : `\n\nKm. óra állás: ${Number(item.form.km).toLocaleString("hu-HU")} km`;
          alert(
            `Az autó adatai betöltve az összes fülre (1–5).\n\n${item.importSummaryText || ""}${kmNote}${missing}\n\nLépj végig a füleken és ellenőrizd!`
          );
        }
      });
      resultsEl.appendChild(row);
    }

    sessionStorage.setItem(IMPORT_LIST_KEY, JSON.stringify(items));
  }

  function restoreResults() {
    try {
      const raw = sessionStorage.getItem(IMPORT_LIST_KEY);
      if (raw) renderResults(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }

  async function openChromeOnly() {
    const url = urlInput.value.trim() || "https://www.hasznaltauto.hu/szemelyauto";
    if (chromeBtn) {
      chromeBtn.disabled = true;
      chromeBtn.textContent = "Chrome indul…";
    }
    appendLog("Google Chrome indítása…");
    try {
      const response = await fetch("/api/open-chrome", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await response.json();
      for (const line of data.logs ?? []) appendLog(line);
      if (!response.ok) throw new Error(data.error || "Chrome nem indult el");
      appendLog("Chrome megnyitva. Oldd meg a Cloudflare-t, majd: Import indítása.");
    } catch (error) {
      appendLog(`Hiba: ${error.message ?? error}`);
      alert(
        (error.message ?? "Chrome nem indult el") +
          "\n\nTelepítve van a Google Chrome?\n\nAlternatíva: kattints „Import indítása” — az is megnyit egy Chrome ablakot."
      );
    } finally {
      if (chromeBtn) {
        chromeBtn.disabled = false;
        chromeBtn.textContent = "Chrome megnyitása";
      }
    }
  }

  chromeBtn?.addEventListener("click", openChromeOnly);

  startBtn.addEventListener("click", async () => {
    if (importing) return;
    const url = urlInput.value.trim();
    if (!url) {
      alert("Illeszd be a hasznaltauto.hu lista vagy hirdetés URL-t.");
      return;
    }

    importing = true;
    startBtn.disabled = true;
    startBtn.textContent = "Importálás…";
    if (logEl) {
      if (logEl.childElementCount > 0) {
        appendLog("— Új import —");
      }
      logEl.hidden = false;
    }
    if (resultsEl) resultsEl.hidden = true;

    appendLog("Import indul — megnyílik egy látható Chrome ablak.");

    try {
      const response = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, limit: 50 }),
      });

      if (!response.ok && response.headers.get("content-type")?.includes("json")) {
        const err = await response.json();
        throw new Error(err.error || "Import hiba");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (reader) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data:")) continue;
          const payload = JSON.parse(line.slice(5).trim());
          if (payload.type === "log") appendLog(payload.message);
          if (payload.type === "error") throw new Error(payload.message);
          if (payload.type === "done") {
            renderResults(payload.result.items ?? []);
            appendLog(`Kész: ${payload.result.count} hirdetés importálva.`);
            if (payload.result.errors?.length) {
              appendLog(`${payload.result.errors.length} hiba (részletek a konzolban).`);
              console.warn("Import hibák:", payload.result.errors);
            }
          }
        }
      }
    } catch (error) {
      appendLog(`Hiba: ${error.message ?? error}`);
      const hint =
        error.message?.includes("Cloudflare") || error.message?.includes("hirdetést")
          ? "\n\n1) Chrome megnyitása gomb → oldd meg a Cloudflare-t\n2) Várj, amíg látszanak a hirdetések\n3) Import indítása újra"
          : "";
      alert((error.message ?? "Import sikertelen.") + hint);
    } finally {
      importing = false;
      startBtn.disabled = false;
      startBtn.textContent = "Import indítása (max 50)";
    }
  });

  restoreResults();
  checkVersion();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
