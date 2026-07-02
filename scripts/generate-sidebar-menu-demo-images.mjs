#!/usr/bin/env node
/**
 * Sidebar menü demo PNG-k — solid fehér ikonok, narancs háttér (screenshot stílus).
 *   node scripts/generate-sidebar-menu-demo-images.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import {
  SIDEBAR_MENU_DEMO_ROWS,
  SIDEBAR_ORANGE,
  SIDEBAR_ORANGE_LIGHT,
  SOLID_ICON_PATHS,
} from "./sidebar-menu-solid-icons.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const OUT_DIR = path.join(ROOT, "public/icons/sidebar/demo");
const ROWS_DIR = path.join(OUT_DIR, "rows");
const ICONS_DIR = path.join(OUT_DIR, "icons");

const ROW_W = 320;
const ROW_H = 44;
const FULL_W = 320;

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function iconInner(iconId, color = "#ffffff") {
  const inner = SOLID_ICON_PATHS[iconId];
  if (!inner) return "";
  return inner.replace(/#fff/g, color).replace(/#ffffff/g, color);
}

function rowSvg(row, { standalone = true, expanded = false } = {}) {
  const padLeft = row.level === 0 ? 12 : row.level === 1 ? 22 : 34;
  const active = Boolean(row.active);
  const bg = active ? "#ffffff" : standalone ? SIDEBAR_ORANGE : "transparent";
  const fg = active ? SIDEBAR_ORANGE : "#ffffff";
  const fontSize = row.level === 0 ? 13.5 : row.level === 1 ? 12.5 : 11.5;
  const fontWeight = row.level === 0 ? 600 : 600;
  const yText = 28;
  const iconSize = row.level === 0 ? 20 : row.level === 1 ? 18 : 16;
  const iconX = padLeft;
  const textX = row.icon ? padLeft + iconSize + 8 : padLeft;
  const showIcon = row.icon && row.level === 0;
  const showChevron = row.parent && row.level === 0;

  let badge = "";
  if (row.badge) {
    badge = `<circle cx="${FULL_W - 36}" cy="18" r="9" fill="#ef4444"/>
      <text x="${FULL_W - 36}" y="22" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="10" font-weight="700">${row.badge}</text>`;
  }

  const rect = standalone
    ? `<rect width="${ROW_W}" height="${ROW_H}" fill="${bg}" rx="${active ? 10 : 0}"/>`
    : `<rect width="${ROW_W}" height="${ROW_H}" fill="${bg}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ROW_W}" height="${ROW_H}" viewBox="0 0 ${ROW_W} ${ROW_H}">
    ${rect}
    ${showIcon ? `<svg x="${iconX}" y="${(ROW_H - iconSize) / 2}" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24">${iconInner(row.icon, fg)}</svg>` : ""}
    <text x="${textX}" y="${yText}" fill="${fg}" font-family="system-ui,-apple-system,BlinkMacSystemFont,sans-serif" font-size="${fontSize}" font-weight="${fontWeight}">${escapeXml(row.label)}</text>
    ${showChevron ? (expanded
      ? `<path fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" d="M${ROW_W - 22} 20 l4-4 4 4"/>`
      : `<path fill="none" stroke="${fg}" stroke-width="2" stroke-linecap="round" d="M${ROW_W - 22} 16 l4 4-4 4"/>`) : ""}
    ${badge}
  </svg>`;
}

function sectionLabelSvg(label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FULL_W}" height="22" viewBox="0 0 ${FULL_W} 22">
    <text x="10" y="14" fill="rgba(255,255,255,0.58)" font-family="system-ui,sans-serif" font-size="9" font-weight="700" letter-spacing="1">${escapeXml(label.toUpperCase())}</text>
  </svg>`;
}

function headerSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FULL_W}" height="52" viewBox="0 0 ${FULL_W} 52">
    <rect width="${FULL_W}" height="52" fill="${SIDEBAR_ORANGE}"/>
    <rect x="14" y="12" width="30" height="30" rx="10" fill="rgba(255,255,255,0.18)"/>
    <text x="29" y="32" text-anchor="middle" fill="#fff" font-family="system-ui,sans-serif" font-size="16" font-weight="800">B</text>
    <text x="52" y="24" fill="#fff" font-family="system-ui,sans-serif" font-size="14" font-weight="700">Bocsa</text>
    <text x="52" y="38" fill="rgba(255,255,255,0.82)" font-family="system-ui,sans-serif" font-size="10">Betrieb</text>
  </svg>`;
}

function logoutSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${FULL_W}" height="52" viewBox="0 0 ${FULL_W} 52">
    <rect width="${FULL_W}" height="52" fill="${SIDEBAR_ORANGE}"/>
    <rect x="10" y="8" width="${FULL_W - 20}" height="36" rx="10" fill="none" stroke="rgba(255,255,255,0.55)" stroke-width="1.5"/>
    <rect x="18" y="18" width="12" height="16" rx="2" fill="none" stroke="#fff" stroke-width="1.75"/>
    <path fill="none" stroke="#fff" stroke-width="1.75" stroke-linecap="round" d="M24 22h12M32 18l4 4-4 4"/>
    <text x="46" y="29" fill="#fff" font-family="system-ui,sans-serif" font-size="13" font-weight="600">Abmelden</text>
  </svg>`;
}

async function svgToPng(svg, outPath) {
  await sharp(Buffer.from(svg)).png().toFile(outPath);
}

async function generateIconOnly(iconId, outPath) {
  const size = 96;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${SIDEBAR_ORANGE_LIGHT}"/>
        <stop offset="100%" stop-color="${SIDEBAR_ORANGE}"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" rx="16" fill="url(#g)"/>
    <g transform="translate(${(size - 48) / 2}, ${(size - 48) / 2}) scale(2)">${iconInner(iconId)}</g>
  </svg>`;
  await svgToPng(svg, outPath);
}

async function generateFullSidebar(outPath) {
  const parts = [];
  let y = 0;
  const layers = [];

  const header = headerSvg();
  layers.push({ input: Buffer.from(header), top: y, left: 0 });
  y += 52;

  let lastSection = "";
  for (const row of SIDEBAR_MENU_DEMO_ROWS) {
    if (row.section !== lastSection) {
      if (lastSection) y += 8;
      const label = sectionLabelSvg(row.section);
      layers.push({ input: Buffer.from(label), top: y, left: 0 });
      y += 22;
      lastSection = row.section;
    }
    const expanded = row.slug === "lager";
    const svg = rowSvg(row, { standalone: false, expanded });
    layers.push({ input: Buffer.from(svg), top: y, left: 0 });
    y += ROW_H;
  }

  y += 12;
  layers.push({ input: Buffer.from(logoutSvg()), top: y, left: 0 });
  y += 52;

  const bgSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${FULL_W}" height="${y}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${SIDEBAR_ORANGE_LIGHT}"/>
        <stop offset="100%" stop-color="${SIDEBAR_ORANGE}"/>
      </linearGradient>
    </defs>
    <rect width="${FULL_W}" height="${y}" fill="url(#bg)"/>
  </svg>`;

  await sharp(Buffer.from(bgSvg))
    .composite(layers)
    .png()
    .toFile(outPath);
}

async function main() {
  await fs.mkdir(ROWS_DIR, { recursive: true });
  await fs.mkdir(ICONS_DIR, { recursive: true });

  for (const row of SIDEBAR_MENU_DEMO_ROWS) {
    const expanded = row.slug === "lager";
    const svg = rowSvg(row, { standalone: true, expanded });
    await svgToPng(svg, path.join(ROWS_DIR, `${row.slug}.png`));
  }

  const uniqueIconIds = [...new Set(Object.keys(SOLID_ICON_PATHS))];
  for (const iconId of uniqueIconIds) {
    await generateIconOnly(iconId, path.join(ICONS_DIR, `${iconId}.png`));
  }

  await generateFullSidebar(path.join(OUT_DIR, "full-sidebar.png"));

  const manifest = SIDEBAR_MENU_DEMO_ROWS.map((row) => ({
    slug: row.slug,
    label: row.label,
    section: row.section,
    icon: row.icon,
    level: row.level,
    rowPng: `/icons/sidebar/demo/rows/${row.slug}.png`,
    iconPng: row.icon ? `/icons/sidebar/demo/icons/${row.icon}.png` : null,
  }));

  await fs.writeFile(path.join(OUT_DIR, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`✓ ${SIDEBAR_MENU_DEMO_ROWS.length} row PNG → public/icons/sidebar/demo/rows/`);
  console.log(`✓ ${uniqueIconIds.length} icon PNG → public/icons/sidebar/demo/icons/`);
  console.log(`✓ full-sidebar.png`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
