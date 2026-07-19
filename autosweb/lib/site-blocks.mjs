import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, "..", "data");
const BLOCKS_PATH = process.env.AUTOSWEB_BLOCKS_PATH || join(DATA_DIR, "site-blocks.json");

const DEFAULT_BLOCKS = {
  left: {
    title: "Kiemelt ajánlatok",
    html: "<p>Itt jelenik meg a bal oldali szerkeszthető tartalom.</p>",
  },
  right: {
    title: "Hasznos információk",
    html: "<p>Itt jelenik meg a jobb oldali szerkeszthető tartalom.</p>",
  },
};

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function normalizeBlock(value, fallback) {
  if (!value || typeof value !== "object") return { ...fallback };
  return {
    title: String(value.title ?? fallback.title).slice(0, 120),
    html: String(value.html ?? fallback.html).slice(0, 12000),
  };
}

export function getSiteBlocks() {
  ensureDataDir();
  if (!existsSync(BLOCKS_PATH)) {
    writeFileSync(BLOCKS_PATH, JSON.stringify(DEFAULT_BLOCKS, null, 2), "utf8");
    return structuredClone(DEFAULT_BLOCKS);
  }
  try {
    const parsed = JSON.parse(readFileSync(BLOCKS_PATH, "utf8"));
    return {
      left: normalizeBlock(parsed.left, DEFAULT_BLOCKS.left),
      right: normalizeBlock(parsed.right, DEFAULT_BLOCKS.right),
    };
  } catch {
    return structuredClone(DEFAULT_BLOCKS);
  }
}

export function saveSiteBlocks(payload) {
  ensureDataDir();
  const next = {
    left: normalizeBlock(payload?.left, DEFAULT_BLOCKS.left),
    right: normalizeBlock(payload?.right, DEFAULT_BLOCKS.right),
  };
  writeFileSync(BLOCKS_PATH, JSON.stringify(next, null, 2), "utf8");
  return next;
}
