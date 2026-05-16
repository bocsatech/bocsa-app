import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const MACHINE_TABLE = "maschines";
const STORAGE_BUCKET = "machine-files";
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const MAX_IMAGES = 4;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function safeFilePart(value) {
  return String(value || "meldung")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function extensionFromType(type) {
  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/heic") return "heic";
  if (type === "image/heif") return "heif";
  return "jpg";
}

async function saveMeldungImage(db, file, machineId, reportId, index) {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Nur JPG, PNG, WEBP, HEIC oder HEIF Bilder sind erlaubt.");
  }

  if (file.size > MAX_IMAGE_SIZE) {
    throw new Error("Ein Bild darf maximal 5 MB groß sein.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = `${safeFilePart(machineId)}_${safeFilePart(reportId)}_${index}.${extensionFromType(file.type)}`;
  const storagePath = `meldungen/${filename}`;
  const { error } = await db.storage.from(STORAGE_BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    throw new Error(error.message);
  }

  return db.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

async function readMeldungRequest(request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    return {
      message: normalizeText(formData.get("message")),
      reporter: normalizeText(formData.get("reporter")),
      contact: normalizeText(formData.get("contact")),
      images: formData
        .getAll("images")
        .filter((value) => value && typeof value !== "string")
        .slice(0, MAX_IMAGES),
    };
  }

  const body = await request.json().catch(() => ({}));
  return {
    message: normalizeText(body.message),
    reporter: normalizeText(body.reporter),
    contact: normalizeText(body.contact),
    images: [],
  };
}

async function getMeldungSettings(db) {
  const { data } = await db
    .from("app_settings")
    .select("value")
    .eq("key", "meldung")
    .maybeSingle();

  return data?.value && typeof data.value === "object" ? data.value : {};
}

function parseRecipients(value) {
  return normalizeText(value)
    .split(/[\n,;]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function sendMeldungEmail(settings, machine, report) {
  const recipients = parseRecipients(settings.email);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.MELDUNG_EMAIL_FROM ?? "Bocsa App <onboarding@resend.dev>";

  if (!recipients.length) {
    return { status: "disabled", recipients: [], error: "Keine Empfänger E-Mail eingestellt." };
  }

  if (!apiKey) {
    return { status: "missing_api_key", recipients, error: "RESEND_API_KEY fehlt in Vercel." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: recipients,
      subject: `Neue Meldung: ${machine.geraetenummer ?? machine.id}`,
      text: [
        `Maschine: ${machine.geraetenummer ?? machine.id}`,
        machine.bezeichnung ? `Bezeichnung: ${machine.bezeichnung}` : null,
        report.reporter ? `Name: ${report.reporter}` : null,
        report.contact ? `Kontakt: ${report.contact}` : null,
        "",
        report.message,
        "",
        report.images?.length ? `Bilder: ${report.images.join(", ")}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    return {
      status: "failed",
      recipients,
      error: result.message ?? result.error ?? `Resend Fehler ${response.status}`,
    };
  }

  return { status: "sent", recipients, id: result.id ?? null };
}

export async function POST(request, { params }) {
  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { id } = await params;
  const payload = await readMeldungRequest(request);
  const message = payload.message;
  const reporter = payload.reporter;
  const contact = payload.contact;

  if (!message) {
    return NextResponse.json({ error: "Bitte eine Meldung eingeben." }, { status: 400 });
  }

  const { data: machine, error: loadError } = await db
    .from(MACHINE_TABLE)
    .select("id, geraetenummer, bezeichnung, machine_tab_data")
    .eq("id", id)
    .single();

  if (loadError || !machine) {
    return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });
  }

  const tabData =
    machine.machine_tab_data && typeof machine.machine_tab_data === "object"
      ? machine.machine_tab_data
      : {};
  const existingReports = Array.isArray(tabData.meldungen) ? tabData.meldungen : [];
  const reportId = `meldung-${Date.now()}`;
  const imageUrls = [];
  const imageErrors = [];

  for (const [index, image] of payload.images.entries()) {
    try {
      imageUrls.push(await saveMeldungImage(db, image, id, reportId, index + 1));
    } catch (error) {
      imageErrors.push(error instanceof Error ? error.message : "Bild konnte nicht gespeichert werden.");
    }
  }

  const settings = await getMeldungSettings(db);
  const emailDelivery = await sendMeldungEmail(settings, machine, {
    message,
    reporter: reporter || null,
    contact: contact || null,
    images: imageUrls,
  }).catch((error) => ({
    status: "failed",
    recipients: parseRecipients(settings.email),
    error: error instanceof Error ? error.message : "Unbekannter E-Mail Fehler.",
  }));

  const report = {
    id: reportId,
    message,
    reporter: reporter || null,
    contact: contact || null,
    images: imageUrls,
    imageErrors,
    emailDelivery,
    createdAt: new Date().toISOString(),
    status: "Neu",
  };

  const { error } = await db
    .from(MACHINE_TABLE)
    .update({
      machine_tab_data: {
        ...tabData,
        meldungen: [report, ...existingReports],
      },
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, imageErrors, emailDelivery });
}
