import * as XLSX from "xlsx";

const FIELD_ALIASES = {
  herstellernummer: [
    "herstellernummer",
    "hersteller nummer",
    "hersteller-nr",
    "artikelnummer",
    "artikel nummer",
    "teilenummer",
    "teile nummer",
  ],
  bezeichnung: [
    "bezeichnung",
    "ersatzteil",
    "ersatzteile",
    "artikelbezeichnung",
    "artikel bezeichnung",
    "teilname",
    "teil name",
    "produktname",
    "produkt name",
    "name",
    "beschreibung",
  ],
  produktgruppe: ["produktgruppe", "produkt gruppe", "gruppe"],
  lieferant: ["lieferant", "supplier"],
  lagerort: ["lagerort", "lager ort"],
  lagerplatz: ["lagerplatz", "lager platz", "lagerplaz"],
  lagerstand: ["lagerstand", "lager stand", "bestand", "menge", "anzahl"],
  listenpreis_netto: ["listenpreis netto", "listenpreis_netto", "lp netto", "netto"],
  listenpreis_brutto: ["listenpreis brutto", "listenpreis_brutto", "lp brutto", "brutto"],
  verkaufspreis: ["verkaufspreis", "verkauf preis", "vk preis"],
  bestellstatus: ["bestellstatus", "bestellungstatus", "bestell status", "status bestellung"],
  bild: ["bild", "image", "foto", "url"],
};

function normalizeHeader(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mapHeader(header) {
  const normalized = normalizeHeader(header);
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(normalized)) {
      return field;
    }
  }
  return null;
}

function parseNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim().replace(/\s/g, "").replace(",", ".");
  if (!text) return null;
  const number = Number(text);
  return Number.isNaN(number) ? null : number;
}

function parseText(value) {
  if (value === null || value === undefined) return null;
  const text = sanitizeImportedText(String(value).trim());
  return text || null;
}

/** Entfernt „Boels“ und ähnliche Markenreste aus Import-Zellen. */
export function sanitizeImportedText(value) {
  if (!value) return "";
  return String(value)
    .replace(/\bboels\b/gi, "")
    .replace(/\btechnikweb\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([,;])/g, "$1")
    .trim();
}

function rowToRecord(cells, headerMap) {
  const record = {};

  for (const [index, field] of Object.entries(headerMap)) {
    const raw = cells[Number(index)];
    if (field === "lagerstand") {
      record.lagerstand = parseNumber(raw) ?? 0;
    } else if (
      field === "listenpreis_netto" ||
      field === "listenpreis_brutto" ||
      field === "verkaufspreis"
    ) {
      record[field] = parseNumber(raw);
    } else {
      record[field] = parseText(raw);
    }
  }

  return record;
}

export function parseLagerSpreadsheet(buffer, filename = "") {
  const lowerName = filename.toLowerCase();
  let workbook;

  if (lowerName.endsWith(".csv") || lowerName.endsWith(".txt")) {
    const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
    workbook = XLSX.read(text, { type: "string", raw: false });
  } else {
    workbook = XLSX.read(buffer, { type: "buffer", raw: false });
  }

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Die Datei enthält kein Tabellenblatt.");
  }

  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    defval: "",
    blankrows: false,
  });

  if (!rows.length) {
    throw new Error("Die Datei ist leer.");
  }

  const headerRow = rows[0].map((cell) => String(cell ?? ""));
  const headerMap = {};

  headerRow.forEach((header, index) => {
    const field = mapHeader(header);
    if (field) {
      headerMap[index] = field;
    }
  });

  if (!Object.values(headerMap).includes("herstellernummer")) {
    throw new Error(
      "Spalte „Herstellernummer“ fehlt. Erwartete Kopfzeile z. B. Herstellernummer, Produktgruppe, Lagerstand …"
    );
  }

  const records = [];
  const errors = [];

  for (let rowIndex = 1; rowIndex < rows.length; rowIndex += 1) {
    const cells = rows[rowIndex];
    if (!cells || cells.every((cell) => String(cell ?? "").trim() === "")) {
      continue;
    }

    const record = rowToRecord(cells, headerMap);
    if (!record.herstellernummer) {
      errors.push(`Zeile ${rowIndex + 1}: Herstellernummer fehlt.`);
      continue;
    }

    records.push(record);
  }

  return { records, errors, sheetName };
}

export async function importLagerRecords(db, records) {
  let imported = 0;
  let updated = 0;
  const errors = [];

  const { data: existing, error: loadError } = await db
    .from("lager_teile")
    .select("id, herstellernummer");

  if (loadError) {
    throw new Error(loadError.message);
  }

  const existingByNumber = new Map(
    (existing ?? []).map((row) => [String(row.herstellernummer).trim().toLowerCase(), row.id])
  );

  for (const record of records) {
    const key = record.herstellernummer.trim().toLowerCase();
    const existingId = existingByNumber.get(key);

    if (existingId) {
      const { error } = await db.from("lager_teile").update(record).eq("id", existingId);
      if (error) {
        errors.push(`${record.herstellernummer}: ${error.message}`);
      } else {
        updated += 1;
      }
    } else {
      const { data, error } = await db.from("lager_teile").insert(record).select("id").single();
      if (error) {
        errors.push(`${record.herstellernummer}: ${error.message}`);
      } else if (data) {
        existingByNumber.set(key, data.id);
        imported += 1;
      }
    }
  }

  return { imported, updated, errors };
}
