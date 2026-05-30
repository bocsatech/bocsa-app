import { NextResponse } from "next/server";
import { currentUserIsInGroup } from "../../../../../lib/auth/permissions";
import { normalizeMachineImage } from "../../../../../lib/machine-image.mjs";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const MACHINE_TABLE = "maschines";
const STORAGE_BUCKET = "machine-files";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function normalizedImageFilename(geraetenummer, id) {
  return `${safeFilePart(geraetenummer)}_${safeFilePart(id)}.webp`;
}

function safeFilePart(value) {
  return String(value || "maschine")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function normalizeMachine(row) {
  if (!row) return row;
  return {
    ...row,
    geraetenummer: row.geraetenummer ?? null,
    image: row.kep ?? null,
  };
}

async function saveImageFile(db, buffer, filename, contentType) {
  const storagePath = `images/${filename}`;
  const { error } = await db.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType,
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return db.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

export async function POST(request, { params }) {
  if (!(await currentUserIsInGroup("Admin"))) {
    return NextResponse.json(
      { error: "Nur Admin-Benutzer dürfen Maschinenbilder hochladen." },
      { status: 403 }
    );
  }

  const { id } = await params;
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

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

  const { data: machine, error: loadError } = await db
    .from(MACHINE_TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (loadError || !machine) {
    return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });
  }

  const rawBuffer = Buffer.from(await file.arrayBuffer());
  let normalizedBuffer;
  try {
    normalizedBuffer = await normalizeMachineImage(rawBuffer);
  } catch {
    return NextResponse.json(
      { error: "Das Bild konnte nicht verarbeitet werden." },
      { status: 400 }
    );
  }
  const geraetenummer = machine.geraetenummer ?? id;
  const filename = normalizedImageFilename(geraetenummer, id);
  const imagePath = `${await saveImageFile(
    db,
    normalizedBuffer,
    filename,
    "image/webp"
  )}?v=${Date.now()}`;

  const { data, error } = await db
    .from(MACHINE_TABLE)
    .update({ kep: imagePath })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(normalizeMachine(data), {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
