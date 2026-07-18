const IMPORT_LIST_KEY = "autosweb-import-list";

export function initImportPanel({ form, onApply }) {
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
        appendLog(`Betöltve: ${item.cim || item.url}`);
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
          "\n\nTelepítve van a Google Chrome? Ha igen, engedélyezd a megnyitást."
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
      logEl.innerHTML = "";
      logEl.hidden = false;
    }
    if (resultsEl) resultsEl.hidden = true;

    appendLog("Import indul — megnyílik a Google Chrome (vagy a már futó Chrome-hoz csatlakozunk).");

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
      alert(error.message ?? "Import sikertelen.");
    } finally {
      importing = false;
      startBtn.disabled = false;
      startBtn.textContent = "Import indítása (max 50)";
    }
  });

  restoreResults();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
