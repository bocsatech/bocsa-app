import fs from 'fs';
import path from 'path';
import { getDataDir } from './config.mjs';

const HEADER_ALIASES = {
  marke: ['marke', 'marka', 'brand'],
  modell: ['modell', 'model'],
  baujahr: ['baujahr', 'evjarat', 'year', 'ev'],
  km: ['km', 'kilometer'],
  wert: ['wert', 'ertek', 'ar', 'preis', 'price', 'schaetzwert', 'becsult', 'angebot'],
};

function norm(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
}

function mapHeaders(headers) {
  const mapped = {};
  const n = headers.map(norm);
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    for (let i = 0; i < n.length; i++) {
      if (aliases.some((a) => n[i] === a)) {
        mapped[key] = i;
        break;
      }
    }
  }
  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (mapped[key] != null) continue;
    for (let i = 0; i < n.length; i++) {
      if (aliases.some((a) => a.length > 2 && n[i].includes(a))) {
        mapped[key] = i;
        break;
      }
    }
  }
  return mapped;
}

function parseNum(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(String(raw).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}

function parseCsv(text) {
  const sep = (text.split('\n')[0].match(/;/g) || []).length >= (text.split('\n')[0].match(/,/g) || []).length ? ';' : ',';
  const lines = text.replace(/^\uFEFF/, '').trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) throw new Error('Legalább fejléc + 1 sor kell');
  const headers = lines[0].split(sep).map((c) => c.trim());
  const col = mapHeaders(headers);
  if (col.wert == null) throw new Error('Hiányzó ár oszlop (wert, ar, preis…)');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(sep).map((c) => c.trim());
    if (cells.every((c) => !c)) continue;
    rows.push({
      marke: cells[col.marke] ?? '',
      modell: cells[col.modell] ?? '',
      baujahr: cells[col.baujahr] ?? '',
      km: parseNum(cells[col.km]),
      wertEur: parseNum(cells[col.wert]),
    });
  }
  return rows.filter((r) => r.wertEur != null);
}

export function parsePriceChart(text, filename = 'upload.csv') {
  const trimmed = text.trim();
  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    const j = JSON.parse(trimmed);
    const rows = (Array.isArray(j) ? j : j.rows || []).map((r) => ({
      marke: String(r.marke ?? r.brand ?? ''),
      modell: String(r.modell ?? r.model ?? ''),
      baujahr: String(r.baujahr ?? r.year ?? ''),
      km: parseNum(r.km),
      wertEur: parseNum(r.wert ?? r.wertEur ?? r.price),
    }));
    if (!rows.some((r) => r.wertEur != null)) throw new Error('Nincs érvényes ár a fájlban');
    return { uploadedAt: new Date().toISOString(), filename, rowCount: rows.length, rows };
  }
  const rows = parseCsv(trimmed);
  return { uploadedAt: new Date().toISOString(), filename, rowCount: rows.length, rows };
}

export function lookupPrice(chart, { marke, modell, baujahr, km }) {
  if (!chart?.rows?.length) return null;
  const m = String(marke || '').toLowerCase();
  const mo = String(modell || '').toLowerCase();
  let best = null;
  let score = -1;
  for (const row of chart.rows) {
    let s = 0;
    if (m && row.marke.toLowerCase().includes(m)) s += 3;
    if (mo && row.modell.toLowerCase().includes(mo)) s += 3;
    if (baujahr && String(row.baujahr) === String(baujahr)) s += 2;
    if (km && row.km != null && Math.abs(row.km - km) < 30000) s += 1;
    if (s > score) {
      score = s;
      best = row;
    }
  }
  return score >= 3 ? best : null;
}

export function saveChartFile(filename, buffer) {
  const dir = path.join(getDataDir(), 'price-chart');
  fs.mkdirSync(dir, { recursive: true });
  const safe = filename.replace(/[^\w.\-()+ ]/g, '_');
  fs.writeFileSync(path.join(dir, safe), buffer);
}
