const VALUATION_UI_VERSION = "valuation20260726";

let valuationInitialized = false;

function setStatus(statusEl, message, type = "") {
  if (!statusEl) return;
  statusEl.hidden = !message;
  statusEl.textContent = message ?? "";
  statusEl.dataset.statusType = type;
}

function fillBrandSelect(select, brands, emptyLabel = "Válassz márkát") {
  if (!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">${emptyLabel}</option>`;
  for (const brand of brands) {
    const opt = document.createElement("option");
    opt.value = brand;
    opt.textContent = brand;
    select.appendChild(opt);
  }
  if (current && brands.includes(current)) select.value = current;
}

async function fetchValuationOptions() {
  const response = await fetch("/api/valuation/options");
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Opciók betöltése sikertelen.");
  return data;
}

async function fetchValuationEstimate(params) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value != null && String(value).trim() !== "") query.set(key, String(value).trim());
  }
  const response = await fetch(`/api/valuation/estimate?${query}`);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error ?? "Becslés sikertelen.");
  return data;
}

function renderResult(resultEl, data) {
  if (!resultEl) return;
  if (!data.count) {
    resultEl.hidden = false;
    resultEl.className = "home-valuation-result home-valuation-result--empty";
    resultEl.textContent = data.message ?? "Nincs egyező hirdetés.";
    return;
  }

  resultEl.hidden = false;
  resultEl.className = "home-valuation-result home-valuation-result--ok";
  resultEl.innerHTML = `
    <p class="home-valuation-result-label">Becsült átlagár</p>
    <p class="home-valuation-result-price">${data.average_price_formatted ?? "—"}</p>
    <p class="home-valuation-result-meta">${data.message ?? ""}</p>
    ${
      data.min_price_formatted && data.max_price_formatted
        ? `<p class="home-valuation-result-range">${data.min_price_formatted} – ${data.max_price_formatted}</p>`
        : ""
    }
  `;
}

export function initHomeValuation(rootId = "home-valuation") {
  if (valuationInitialized) return;
  const root = document.getElementById(rootId);
  const toggleBtn = document.getElementById("home-valuation-toggle");
  const bodyEl = document.getElementById("home-valuation-body");
  const form = document.getElementById("home-valuation-form");
  const brandSelect = document.getElementById("valuation-gyartmany");
  const statusEl = document.getElementById("home-valuation-status");
  const resultEl = document.getElementById("home-valuation-result");
  if (!root || !toggleBtn || !bodyEl || !form || !brandSelect) return;

  valuationInitialized = true;
  root.dataset.valuationUiVersion = VALUATION_UI_VERSION;

  let optionsLoaded = false;

  function setExpanded(expanded) {
    root.classList.toggle("is-collapsed", !expanded);
    bodyEl.hidden = !expanded;
    toggleBtn.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  async function loadOptions() {
    if (optionsLoaded) return;
    setStatus(statusEl, "Márkák betöltése…", "info");
    try {
      const data = await fetchValuationOptions();
      fillBrandSelect(brandSelect, data.gyartmanyok ?? []);
      optionsLoaded = true;
      setStatus(statusEl, "", "");
    } catch (error) {
      setStatus(statusEl, error.message ?? "Nem sikerült betölteni a márkákat.", "err");
    }
  }

  toggleBtn.addEventListener("click", () => {
    const willExpand = root.classList.contains("is-collapsed");
    if (willExpand) {
      setExpanded(true);
      loadOptions();
      return;
    }
    setExpanded(false);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    setStatus(statusEl, "Számítás…", "info");
    resultEl.hidden = true;

    try {
      const data = await fetchValuationEstimate({
        gyartmany: formData.get("gyartmany"),
        modell_tipus: formData.get("modell_tipus"),
        gyartasi_ev: formData.get("gyartasi_ev"),
        km: formData.get("km"),
      });
      if (data.error) {
        setStatus(statusEl, data.error, "err");
        return;
      }
      setStatus(statusEl, "", "");
      renderResult(resultEl, data);
    } catch (error) {
      setStatus(statusEl, error.message ?? "Nem sikerült kiszámítani az átlagárat.", "err");
    }
  });

  setExpanded(false);
}
