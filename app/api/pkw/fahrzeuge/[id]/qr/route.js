import { NextResponse } from "next/server";
import QRCode from "qrcode";
import { canAccessPkwKunden } from "../../../../../../lib/pkw-permissions-server.mjs";
import { getSupabaseAdmin } from "../../../../../../lib/supabaseAdmin";

const TABLE = "pkw_fahrzeuge";

export async function GET(request, { params }) {
  if (!(await canAccessPkwKunden("read"))) {
    return NextResponse.json({ error: "Keine Berechtigung: pkw.kunden.read" }, { status: 403 });
  }

  const db = getSupabaseAdmin();
  if (!db) return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });

  const id = (await params).id;
  const { data: fahrzeug, error } = await db
    .from(TABLE)
    .select("qr_token, kennzeichen")
    .eq("id", id)
    .maybeSingle();

  if (error || !fahrzeug?.qr_token) {
    return NextResponse.json({ error: "Fahrzeug nicht gefunden." }, { status: 404 });
  }

  const origin = request.nextUrl.origin;
  const targetUrl = `${origin}/pkw/buchen?token=${encodeURIComponent(fahrzeug.qr_token)}`;

  const png = await QRCode.toBuffer(targetUrl, {
    errorCorrectionLevel: "M",
    type: "png",
    width: 280,
    margin: 2,
    color: { dark: "#111827", light: "#ffffff" },
  });

  return new NextResponse(png, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=300",
    },
  });
}
