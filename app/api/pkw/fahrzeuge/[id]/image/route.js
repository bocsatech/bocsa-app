import { NextResponse } from "next/server";
import { canAccessPkwKunden } from "../../../../../../lib/pkw-permissions-server.mjs";
import { normalizeMachineImage } from "../../../../../../lib/machine-image.mjs";
import { getSupabaseAdmin } from "../../../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const TABLE = "pkw_fahrzeuge";
const STORAGE_BUCKET = "machine-files";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function safeFilePart(value) {
  return String(value || "pkw")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function imageFilename(kennzeichen, id) {
  return `pkw_${safeFilePart(kennzeichen)}_${safeFilePart(id)}.webp`;
}

async function saveImageFile(db, buffer, filename) {
  const storagePath = `pkw/images/${filename}`;
  const { error } = await db.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: "image/webp",
    upsert: true,
  });
  if (error) throw new Error(error.message);
  return db.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export async function POST(request, { params }) {
  if (!(await canAccessPkwKunden("write"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.write" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { id } = await params;
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("image");

  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Keine Bilddatei gefunden." }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Nur JPG, PNG oder WEBP sind erlaubt." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "Das Bild darf maximal 5 MB groß sein." }, { status: 400 });
  }

  const { data: fahrzeug, error: loadError } = await db
    .from(TABLE)
    .select("id, kennzeichen")
    .eq("id", id)
    .single();

  if (loadError || !fahrzeug) {
    return NextResponse.json({ error: "Fahrzeug nicht gefunden." }, { status: 404 });
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  let normalizedBuffer;
  try {
    normalizedBuffer = await normalizeMachineImage(rawBuffer);
  } catch {
    return NextResponse.json({ error: "Das Bild konnte nicht verarbeitet werden." }, { status: 400 });
  }

  const bild = `${await saveImageFile(
    db,
    normalizedBuffer,
    imageFilename(fahrzeug.kennzeichen, fahrzeug.id)
  )}?v=${Date.now()}`;

  const { data, error } = await db
    .from(TABLE)
    .update({ bild, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
