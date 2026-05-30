/**
 * Bestehende Maschinenbilder neu normalisieren (trim + cover, ohne Letterbox).
 *
 *   node scripts/reprocess-machine-images.mjs
 *   node scripts/reprocess-machine-images.mjs --dry-run
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";
import { normalizeMachineImage } from "../lib/machine-image.mjs";

function loadEnv() {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx);
    const value = trimmed.slice(idx + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Fehlt: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const STORAGE_BUCKET = "machine-files";
const dryRun = process.argv.includes("--dry-run");
const supabase = createClient(url, key);

function storagePathFromPublicUrl(publicUrl) {
  const marker = `/storage/v1/object/public/${STORAGE_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(publicUrl.slice(idx + marker.length));
}

async function main() {
  const { data: machines, error } = await supabase
    .from("maschines")
    .select("id, geraetenummer, kep")
    .not("kep", "is", null);

  if (error) {
    console.error("Maschinen laden fehlgeschlagen:", error.message);
    process.exit(1);
  }

  const withImage = (machines ?? []).filter((m) => m.kep);
  console.log(`${withImage.length} Maschine(n) mit Bild${dryRun ? " (dry-run)" : ""}`);

  let ok = 0;
  let failed = 0;

  for (const machine of withImage) {
    const label = machine.geraetenummer || machine.id;
    const storagePath = storagePathFromPublicUrl(machine.kep);
    if (!storagePath) {
      console.log(`✗ ${label}: unbekannte Bild-URL`);
      failed += 1;
      continue;
    }

    try {
      const response = await fetch(machine.kep);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const raw = Buffer.from(await response.arrayBuffer());
      const normalized = await normalizeMachineImage(raw);

      if (dryRun) {
        console.log(`· ${label}: ${storagePath} (${raw.length} → ${normalized.length} bytes)`);
        ok += 1;
        continue;
      }

      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(storagePath, normalized, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const baseUrl = machine.kep.replace(/\?.*$/, "");
      const bustUrl = `${baseUrl}?v=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("maschines")
        .update({ kep: bustUrl })
        .eq("id", machine.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      console.log(`✓ ${label}`);
      ok += 1;
    } catch (err) {
      console.log(`✗ ${label}: ${err.message}`);
      failed += 1;
    }
  }

  console.log(`\nFertig: ${ok} ok, ${failed} fehlgeschlagen`);
  if (!dryRun && ok > 0) {
    console.log("Hinweis: Browser-Cache leeren (Cmd+Shift+R) für neue Bilder.");
  }
}

main();
