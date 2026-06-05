import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { buildLagerTeilQrPng, getLagerQrPayload } from "../lib/lager-qr.mjs";

const TABLE = "lager_teile";
const STORAGE_BUCKET = "machine-files";
const STORAGE_PREFIX = "lager-qr-codes";
const LOCAL_OUTPUT_DIR = path.join(process.cwd(), "public", "lager", "qr-codes");
const EXPORT_MAPPING_FILE = path.join(process.cwd(), "exports", "lager-qr-codes.csv");

function readEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.match(/^([^#=]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), match[2].trim()])
  );
}

function safeFilePart(value) {
  return String(value || "teil")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[;"\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

async function supabaseRequest(url, key, endpoint, options = {}) {
  const response = await fetch(`${url}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...options.headers,
    },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(
      `${options.method ?? "GET"} ${endpoint} fehlgeschlagen (${response.status}): ${body}`
    );
  }
  return body ? JSON.parse(body) : null;
}

async function uploadBuffer(supabase, buffer, filename) {
  const storagePath = `${STORAGE_PREFIX}/${filename}`;
  const { error } = await supabase.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: "image/png",
    upsert: true,
  });
  if (error) {
    throw new Error(`QR-Upload fehlgeschlagen: ${error.message}`);
  }
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

const env = readEnv(await readFile(path.join(process.cwd(), ".env.local"), "utf8"));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY / ANON_KEY fehlt."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const teile =
  (await supabaseRequest(
    supabaseUrl,
    supabaseKey,
    `${TABLE}?select=id,herstellernummer,bezeichnung&order=herstellernummer.asc`
  )) ?? [];

await mkdir(LOCAL_OUTPUT_DIR, { recursive: true });
const mappingRows = [["id", "herstellernummer", "bezeichnung", "qr_url", "qr_payload"]];

let generated = 0;
for (const teil of teile) {
  const id = String(teil.id);
  const herstellernummer = String(teil.herstellernummer ?? "").trim() || id;
  const bezeichnung = String(teil.bezeichnung ?? "").trim();
  const qrPayload = getLagerQrPayload(herstellernummer);
  const filename = `${safeFilePart(herstellernummer)}_${safeFilePart(id)}.png`;

  const qrBuffer = await buildLagerTeilQrPng(herstellernummer);
  const localPath = path.join(LOCAL_OUTPUT_DIR, filename);
  await writeFile(localPath, qrBuffer);

  const qrUrl = await uploadBuffer(supabase, qrBuffer, filename);
  mappingRows.push([id, herstellernummer, bezeichnung, qrUrl, qrPayload]);
  generated += 1;

  console.log(`${herstellernummer}: ${qrUrl}`);
}

const csv = mappingRows.map((row) => row.map(csvEscape).join(";")).join("\n");
await writeFile(EXPORT_MAPPING_FILE, `\uFEFF${csv}\n`, "utf8");

console.log(`QR-Codes generiert: ${generated}`);
console.log(`Mapping exportiert: ${EXPORT_MAPPING_FILE}`);
