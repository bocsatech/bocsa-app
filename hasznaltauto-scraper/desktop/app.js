const urlInput = document.getElementById("url");
const fetchPhonesInput = document.getElementById("fetchPhones");
const paginateInput = document.getElementById("paginate");
const chromeBtn = document.getElementById("chromeBtn");
const scrapeBtn = document.getElementById("scrapeBtn");
const logEl = document.getElementById("log");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");
const versionEl = document.getElementById("version");

let running = false;
let saveTimer = null;

function setStatus(mode, text) {
  statusEl.className = `status ${mode}`;
  statusEl.textContent = text;
}

function appendLog(message) {
  const stamp = new Date().toLocaleTimeString("hu-HU");
  logEl.textContent += `[${stamp}] ${message}\n`;
  logEl.scrollTop = logEl.scrollHeight;
}

function currentPayload() {
  return {
    url: urlInput.value.trim(),
    fetchPhones: fetchPhonesInput.checked,
    paginate: paginateInput.checked,
  };
}

async function saveConfig() {
  const response = await fetch("/api/config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currentPayload()),
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error ?? "Mentés sikertelen");
  }
}

function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveConfig().catch((error) => appendLog(`Mentés hiba: ${error.message}`));
  }, 500);
}

async function loadState() {
  const response = await fetch("/api/state");
  const data = await response.json();

  versionEl.textContent = `v${data.version}`;
  urlInput.value = data.config.url ?? "";
  fetchPhonesInput.checked = data.config.fetchPhones ?? true;
  paginateInput.checked = data.config.paginate ?? true;
  running = data.running;

  setStatus(running ? "running" : "idle", running ? "Fut…" : "Kész");
  setButtons();

  if (data.lastResult?.outputPath) {
    resultEl.textContent = `Utolsó mentés: ${data.lastResult.outputPath} (${data.lastResult.count} hirdetés)`;
  }
}

function setButtons() {
  chromeBtn.disabled = running;
  scrapeBtn.disabled = running;
}

async function postAction(path) {
  await saveConfig();
  setStatus("running", "Fut…");
  running = true;
  setButtons();

  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(currentPayload()),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error ?? "Ismeretlen hiba");
  }

  if (data.result?.outputPath) {
    resultEl.textContent = `Mentve: ${data.result.outputPath} (${data.result.count} hirdetés, ${data.result.pagesScraped} oldal)`;
  }

  return data;
}

chromeBtn.addEventListener("click", async () => {
  try {
    await postAction("/api/chrome");
    setStatus("idle", "Chrome kész");
  } catch (error) {
    setStatus("error", "Hiba");
    appendLog(`Hiba: ${error.message}`);
  } finally {
    running = false;
    setButtons();
  }
});

scrapeBtn.addEventListener("click", async () => {
  try {
    await postAction("/api/scrape");
    setStatus("idle", "Kész");
  } catch (error) {
    setStatus("error", "Hiba");
    appendLog(`Hiba: ${error.message}`);
  } finally {
    running = false;
    setButtons();
  }
});

for (const input of [urlInput, fetchPhonesInput, paginateInput]) {
  input.addEventListener("input", scheduleSave);
  input.addEventListener("change", scheduleSave);
}

const events = new EventSource("/api/events");
events.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === "log") appendLog(data.message);
  if (data.type === "hello") versionEl.textContent = `v${data.version}`;
  if (data.type === "done") {
    running = false;
    setStatus("idle", "Kész");
    setButtons();
    if (data.result?.outputPath) {
      resultEl.textContent = `Mentve: ${data.result.outputPath} (${data.result.count} hirdetés)`;
    }
  }
  if (data.type === "error") {
    running = false;
    setStatus("error", "Hiba");
    setButtons();
  }
};

loadState().catch((error) => appendLog(`Betöltés hiba: ${error.message}`));
