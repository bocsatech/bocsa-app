import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";
import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const MACHINE_TABLE = "maschines";

function normalizeMachine(row) {
  if (!row) return null;
  return {
    geraetenummer: row.geraetenummer ?? "",
    bezeichnung: row.bezeichnung ?? row.beschreibung ?? "",
    serialnummer: row.serial_nummer ?? "",
    baujahr: row.baujahr ?? "",
    letztePruefung:
      row.prufung ?? row.tpg_heben_technik_7_8_gultig_bis ?? "",
    letzteWartung: row.letztes_service_am ?? "",
  };
}

function safeFilePart(value) {
  return String(value || "maschine")
    .trim()
    .replace(/[^a-z0-9-_]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 80);
}

function austrianToday() {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, "0");
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const year = String(now.getFullYear());
  return `${day}.${month}.${year}`;
}

function drawField(doc, label, value, x, y, width) {
  doc.font("Helvetica-Bold").fontSize(8).text(label, x, y, { width });
  doc.font("Helvetica").fontSize(8).text(value || "-", x, y + 10, { width });
  doc.moveTo(x, y + 24).lineTo(x + width, y + 24).strokeColor("#9ca3af").stroke();
}

function drawChecklist(doc, items, startX, startY, columnWidth) {
  const rowHeight = 13;
  items.forEach((item, index) => {
    const col = Math.floor(index / 24);
    const row = index % 24;
    const x = startX + col * columnWidth;
    const y = startY + row * rowHeight;
    doc.rect(x, y + 2, 7, 7).strokeColor("#111827").stroke();
    if (item.checked) {
      doc.moveTo(x + 1.5, y + 5.5).lineTo(x + 3.5, y + 8).lineTo(x + 7, y + 2).stroke();
    }
    doc.font("Helvetica").fontSize(7).fillColor("#111827").text(`${item.code} ${item.label}`, x + 11, y, {
      width: columnWidth - 14,
      lineBreak: false,
    });
  });
}

async function createPdfBuffer(data, machine, username) {
  const doc = new PDFDocument({ size: "A4", margin: 28 });
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const done = new Promise((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  doc.font("Helvetica-Bold").fontSize(15).text("PRÜFBEFUND GEMÄSS §11 AM-VO", 28, 32);
  doc.font("Helvetica").fontSize(10).text("Über wiederkehrende Prüfung für selbstfahrende Arbeitsmittel", 28, 50);
  doc.rect(450, 28, 112, 66).fillColor("#27272a").fill();
  doc.fillColor("#111827");

  const fields = [
    ["Prüfdatum", data.pruefdatum],
    ["Datum der letzten Prüfung", data.datumLetztePruefung],
    ["Datum der letzten Wartung", data.datumLetzteWartung],
    ["Durchgeführt von", data.durchgefuehrtVon || username],
    ["Betr.Std./km", data.betrStdKm],
    ["Maschinenart", data.maschinenArt],
    ["Hersteller / Typ", data.hersteller],
    ["Seriennummer", data.serialnummer],
    ["Baujahr", data.baujahr],
    ["Pickerl Nummer", data.pickerlNummer],
  ];

  let y = 116;
  fields.forEach(([label, value], index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    drawField(doc, label, value, 28 + col * 180, y + row * 34, 165);
  });

  y = 250;
  doc.font("Helvetica-Bold").fontSize(9).text("Prüfpunkte", 28, y);
  drawChecklist(doc, data.checklist ?? [], 28, y + 18, 178);

  y = 590;
  doc.font("Helvetica-Bold").fontSize(9).text("Sonstige Mängel und Erläuterungen", 28, y);
  doc.rect(28, y + 14, 534, 46).strokeColor("#9ca3af").stroke();
  doc.font("Helvetica").fontSize(8).text(data.maengelText || "", 34, y + 20, { width: 522, height: 34 });

  y = 665;
  doc.font("Helvetica-Bold").fontSize(9).text("Arbeitsmittel", 28, y);
  doc.font("Helvetica").fontSize(8).text(`Das Arbeitsmittel entspricht: ${data.entspricht ? "Ja" : "Nein"}`, 28, y + 18);
  doc.text(`Das Arbeitsmittel entspricht nicht: ${data.entsprichtNicht ? "Ja" : "Nein"}`, 280, y + 18);
  doc.text(`Zeitraum/Betr.Std./km: ${data.zeitraum || "-"}`, 28, y + 38);
  doc.text(`Ort der Prüfung: ${data.ortDerPruefung || "-"}`, 28, y + 58);
  doc.text(`Prüfer: ${data.durchgefuehrtVon || username || "-"}`, 28, y + 78);

  doc.font("Helvetica").fontSize(6).text(
    `Maschine: ${machine.geraetenummer || "-"} | ${machine.bezeichnung || "-"} | Seriennummer: ${machine.serialnummer || "-"}`,
    28,
    802,
    { width: 534 }
  );

  doc.end();
  return done;
}

export async function POST(request, { params }) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { data: row, error } = await db.from(MACHINE_TABLE).select("*").eq("id", id).single();
  if (error || !row) {
    return NextResponse.json({ error: "Maschine nicht gefunden." }, { status: 404 });
  }

  const machine = normalizeMachine(row);
  const pdfBuffer = await createPdfBuffer(body, machine, session.username);
  const datePart = body.pruefdatum || austrianToday();
  const filename = `${safeFilePart(machine.geraetenummer || id)}_${safeFilePart(datePart)}.pdf`;
  const outputDir = path.join(process.cwd(), "public", "pruefprotokolle");
  const outputPath = path.join(outputDir, filename);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, pdfBuffer);

  return NextResponse.json({
    filename,
    fileUrl: `/pruefprotokolle/${filename}`,
  });
}
