const SIDE_KEYS = ["left", "right"];

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function fetchBlocks() {
  const response = await fetch("/api/site-blocks");
  if (!response.ok) throw new Error("Nem sikerült betölteni az oldalsáv tartalmat.");
  return response.json();
}

async function saveBlocks(blocks) {
  const response = await fetch("/api/site-blocks", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(blocks),
  });
  if (!response.ok) throw new Error("Mentés sikertelen.");
  return response.json();
}

function renderPanel(side, data, { editing = false } = {}) {
  const panel = document.querySelector(`[data-home-side="${side}"]`);
  if (!panel) return;

  const titleEl = panel.querySelector("[data-side-title]");
  const bodyEl = panel.querySelector("[data-side-body]");
  if (!titleEl || !bodyEl) return;

  if (editing) {
    titleEl.innerHTML = `<input type="text" class="home-side-input" data-edit-title value="${escapeHtml(data.title)}">`;
    bodyEl.innerHTML = `<textarea class="home-side-textarea" data-edit-html rows="8">${escapeHtml(data.html)}</textarea>`;
    return;
  }

  titleEl.textContent = data.title;
  bodyEl.innerHTML = data.html;
}

function readPanel(side) {
  const panel = document.querySelector(`[data-home-side="${side}"]`);
  const title = panel?.querySelector("[data-edit-title]")?.value ?? "";
  const html = panel?.querySelector("[data-edit-html]")?.value ?? "";
  return { title: title.trim(), html: html.trim() };
}

export async function initHomeSideContent() {
  const editBtn = document.getElementById("home-side-edit");
  const saveBtn = document.getElementById("home-side-save");
  const cancelBtn = document.getElementById("home-side-cancel");
  const toolbar = document.getElementById("home-side-toolbar");

  let blocks = await fetchBlocks();
  let editing = false;

  const renderAll = () => {
    for (const side of SIDE_KEYS) {
      renderPanel(side, blocks[side], { editing });
    }
    if (toolbar) toolbar.hidden = !editing;
    if (editBtn) editBtn.hidden = editing;
  };

  renderAll();

  editBtn?.addEventListener("click", () => {
    editing = true;
    renderAll();
  });

  cancelBtn?.addEventListener("click", async () => {
    editing = false;
    blocks = await fetchBlocks();
    renderAll();
  });

  saveBtn?.addEventListener("click", async () => {
    const payload = {
      left: readPanel("left"),
      right: readPanel("right"),
    };
    blocks = await saveBlocks(payload);
    editing = false;
    renderAll();
  });
}
