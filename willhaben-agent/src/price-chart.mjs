import fs from 'fs';
import path from 'path';
import { getPriceChartDir } from './store.mjs';

const HEADER_ALIASES = {
  marke: ['marke', 'marka', 'brand', 'gyártmány', 'gyartmany'],
  modell: ['modell', 'model', 'típus', 'tipus'],
  baujahr: ['baujahr', 'evjarat', 'évjárat', 'year', 'jahr'],
  km: ['km', 'kilometer', 'kilometraz', 'kilométer', 'mileage'],
  wert: ['wert', 'ertek', 'érték', 'ar', 'ár', 'preis', 'price', 'schaetzwert', 'becsult', 'becsült', 'max_angebot'],
};

function normHeader(h) {
  return String(h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, '_');
}

function mapHeaders(headers) {
  const mapped = {};
  const normalized = headers.map(normHeader);

  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    for (let i = 0; i < normalized.length; i++) {
      const h = normalized[i];
      if (aliases.some((a) => h === a)) {
        mapped[key] = i;
        break;
      }
    }
  }

  for (const [key, aliases] of Object.entries(HEADER_ALIASES)) {
    if (mapped[key] != null) continue;
    for (let i = 0; i < normalized.length; i++) {
      const h = normalized[i];
      if (aliases.some((a) => a.length > 2 && h.includes(a))) {
        mapped[key] = i;
        break;
      }
    }
  }

  return mapped;
}

function parseDelimitedLine(line, sep) {
  const out = [];
  let cur = '';
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuote = !inQuote;
      continue;
    }
    if (!inQuote && ch === sep) {
      out.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function detectSeparator(text) {
  const first = text.split(/\r?\n/)[0] || '';
  const semi = (first.match(/;/g) || []).length;
  const comma = (first.match(/,/g) || []).length;
  return semi >= comma ? ';' : ',';
}

function parseNumber(raw) {
  if (raw == null || raw === '') return null;
  const cleaned = String(raw).replace(/[^\d.,-]/g, '').replace(/\./g, '').replace(',', '.');
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function parsePriceChartText(text, filename = 'upload.csv') {
  const trimmed = text.replace(/^\uFEFF/, '').trim();
  if (!trimmed) throw new Error('Üres fájl');

  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const json = JSON.parse(trimmed);
    const rows = Array.isArray(json) ? json : json.rows || json.items || [];
    return normalizeRows(rows, filename, 'json');
  }

  const sep = detectSeparator(trimmed);
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) throw new Error('Legalább fejléc + egy adatsor kell');

  const headers = parseDelimitedLine(lines[0], sep);
  const col = mapHeaders(headers);
  if (col.wert == null) {
    throw new Error('Nincs ár/érték oszlop (pl. wert, ar, schaetzwert, becsult)');
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseDelimitedLine(lines[i], sep);
    if (cells.every((c) => !c)) continue;
    rows.push({
      marke: cells[col.marke] ?? '',
      modell: cells[col.modell] ?? '',
      baujahr: cells[col.baujahr] ?? '',
      km: parseNumber(cells[col.km]),
      wertEur: parseNumber(cells[col.wert]),
      raw: cells,
    });
  }

  return normalizeRows(rows, filename, 'csv');
}

function normalizeRows(rows, filename, format) {
  const normalized = rows
    .map((r, index) => ({
      id: String(index + 1),
      marke: String(r.marke ?? r.brand ?? '').trim(),
      modell: String(r.modell ?? r.model ?? '').trim(),
      baujahr: String(r.baujahr ?? r.year ?? r.evjarat ?? '').trim(),
      km: r.km != null ? r.km : parseNumber(r.kilometer),
      wertEur: r.wertEur != null ? r.wertEur : parseNumber(r.wert ?? r.price ?? r.ar),
    }))
    .filter((r) => r.wertEur != null);

  if (!normalized.length) {
    throw new Error('Nincs érvényes sor árral');
  }

  return {
    uploadedAt: new Date().toISOString(),
    filename,
    format,
    rowCount: normalized.length,
    rows: normalized,
  };
}

export function saveUploadedFile(filename, buffer) {
  const dir = getPriceChartDir();
  fs.mkdirSync(dir, { recursive: true });
  const safe = filename.replace(/[^\w.\-()+ ]/g, '_');
  const dest = path.join(dir, safe);
  fs.writeFileSync(dest, buffer);
  return dest;
}

export function lookupPrice(chart, { marke, modell, baujahr, km }) {
  if (!chart?.rows?.length) return null;
  const m = String(marke || '').toLowerCase();
  const mo = String(modell || '').toLowerCase();
  const y = String(baujahr || '').trim();

  let best = null;
  let bestScore = -1;

  for (const row of chart.rows) {
    let score = 0;
    if (m && row.marke.toLowerCase().includes(m)) score += 3;
    if (mo && row.modell.toLowerCase().includes(mo)) score += 3;
    if (y && String(row.baujahr) === y) score += 2;
    if (km && row.km != null) {
      const diff = Math.abs(row.km - km);
      if (diff < 20000) score += 2;
      else if (diff < 50000) score += 1;
    }
    if (score > bestScore) {
      bestScore = score;
      best = row;
    }
  }

  return bestScore >= 3 ? best : null;
}
