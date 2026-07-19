import { buildYouTubeEmbedHtml } from "./youtube-embed.mjs";

const SIDE_KEYS = ["left", "right"];
const VIDEO_COUNT = 3;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getPageId() {
  return document.body?.dataset?.sitePage || document.querySelector("[data-site-page]")?.dataset?.sitePage || "home";
}

async function fetchPageBlocks(page) {
  const response = await fetch(`/api/site-blocks?page=${encodeURIComponent(page)}`);
  if (!response.ok) throw new Error("Nem sikerült betölteni az oldalsáv tartalmat.");
  return response.json();
}

async function savePageBlocks(page, payload) {
  const response = await fetch("/api/site-blocks", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ page, ...payload }),
  });
  if (!response.ok) throw new Error("Mentés sikertelen.");
  return response.json();
}

function renderVideoSlots(container, videos, { editing = false } = {}) {
  container.innerHTML = "";
  for (let index = 0; index < VIDEO_COUNT; index += 1) {
    const url = videos[index] ?? "";
    const slot = document.createElement("div");
    slot.className = "site-video-slot";
    if (!url && !editing) slot.classList.add("site-video-slot--empty");

    if (editing) {
      slot.innerHTML = `
        <label class="site-video-edit-label">
          <span>YouTube link ${index + 1}</span>
          <input type="url" class="site-video-input" data-video-index="${index}" value="${escapeHtml(url)}" placeholder="https://www.youtube.com/watch?v=…">
        </label>
      `;
    } else if (url) {
      const embed = buildYouTubeEmbedHtml(url);
      slot.innerHTML = embed || `<span class="site-video-placeholder">Érvénytelen YouTube link</span>`;
    } else {
      slot.innerHTML = `<span class="site-video-placeholder">Videó helye ${index + 1}</span>`;
    }

    container.appendChild(slot);
  }
}

function renderPanel(side, data, { editing = false } = {}) {
  const panel = document.querySelector(`[data-site-side="${side}"]`);
  if (!panel) return;

  const titleEl = panel.querySelector("[data-side-title]");
  const videosEl = panel.querySelector("[data-side-videos]");
  if (!titleEl || !videosEl) return;

  if (editing) {
    titleEl.innerHTML = `<input type="text" class="site-side-input" data-edit-title value="${escapeHtml(data.title)}">`;
  } else {
    titleEl.textContent = data.title;
  }

  renderVideoSlots(videosEl, data.videos ?? [], { editing });
}

function readPanel(side) {
  const panel = document.querySelector(`[data-site-side="${side}"]`);
  const title = panel?.querySelector("[data-edit-title]")?.value ?? panel?.querySelector("[data-side-title]")?.textContent ?? "";
  const videos = [];
  panel?.querySelectorAll("[data-video-index]").forEach((input) => {
    videos[Number(input.dataset.videoIndex)] = input.value.trim();
  });
  while (videos.length < VIDEO_COUNT) videos.push("");
  return { title: title.trim(), videos: videos.slice(0, VIDEO_COUNT) };
}

export async function initSiteSideContent() {
  const page = getPageId();
  const editBtn = document.getElementById("site-side-edit");
  const saveBtn = document.getElementById("site-side-save");
  const cancelBtn = document.getElementById("site-side-cancel");
  const toolbar = document.getElementById("site-side-toolbar");

  if (!document.querySelector("[data-site-side]")) return;

  let blocks = await fetchPageBlocks(page);
  let editing = false;

  const pageData = { left: blocks.left, right: blocks.right };

  const renderAll = () => {
    for (const side of SIDE_KEYS) {
      renderPanel(side, pageData[side], { editing });
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
    blocks = await fetchPageBlocks(page);
    pageData.left = blocks.left;
    pageData.right = blocks.right;
    renderAll();
  });

  saveBtn?.addEventListener("click", async () => {
    const payload = {
      left: readPanel("left"),
      right: readPanel("right"),
    };
    const saved = await savePageBlocks(page, payload);
    pageData.left = saved.pages[page].left;
    pageData.right = saved.pages[page].right;
    editing = false;
    renderAll();
  });
}
