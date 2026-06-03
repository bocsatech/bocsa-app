import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../../../lib/auth/permissions";
import { buildLagerTeilQrPng } from "../../../../../../lib/lager-qr.mjs";
import { getSupabaseAdmin } from "../../../../../../lib/supabaseAdmin";

export const runtime = "nodejs";

const TABLE = "lager_teile";

export async function GET(_request, { params }) {
  const canRead = await currentUserHasPermission("warehouse.read");
  const canIssue = await currentUserHasPermission("warehouse.issue");
  const canMachineWrite = await currentUserHasPermission("machines.write");

  if (!canRead && !canIssue && !canMachineWrite) {
    return NextResponse.json(
      {
        error:
          "Keine Berechtigung: warehouse.read, warehouse.issue oder machines.write erforderlich.",
      },
      { status: 403 }
    );
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase ist nicht konfiguriert." }, { status: 500 });
  }

  const { id } = await params;
  const { data, error } = await db
    .from(TABLE)
    .select("herstellernummer")
    .eq("id", id)
    .maybeSingle();

  if (error || !data?.herstellernummer) {
    return NextResponse.json({ error: "Teil nicht gefunden." }, { status: 404 });
  }

  try {
    const png = await buildLagerTeilQrPng(data.herstellernummer);
    return new NextResponse(png, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (qrError) {
    return NextResponse.json(
      {
        error:
          qrError instanceof Error ? qrError.message : "QR-Code konnte nicht erstellt werden.",
      },
      { status: 500 }
    );
  }
}
