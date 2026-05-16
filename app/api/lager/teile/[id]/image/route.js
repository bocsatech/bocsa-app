import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const TABLE = "lager_teile";
const STORAGE_BUCKET = "machine-files";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function extensionFromType(type) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  return "jpg";
}

function safeFilePart(value) {
  return String(value || "teil")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

async function saveImageFile(db, buffer, filename, contentType) {
  const storagePath = `lager/${filename}`;
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
  if (!(await currentUserHasPermission("warehouse.write"))) {
    return NextResponse.json(
      { error: "Keine Berechtigung: warehouse.write erforderlich." },
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

  const { data: teil, error: loadError } = await db
    .from(TABLE)
    .select("*")
    .eq("id", id)
    .single();

  if (loadError || !teil) {
    return NextResponse.json({ error: "Teil nicht gefunden." }, { status: 404 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${safeFilePart(teil.herstellernummer)}_${safeFilePart(id)}.${extensionFromType(file.type)}`;
  const imageUrl = await saveImageFile(db, buffer, filename, file.type);

  const { data, error } = await db
    .from(TABLE)
    .update({ bild: imageUrl })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
