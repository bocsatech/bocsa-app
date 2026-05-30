import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { currentUserHasPermission } from "../../../../../lib/auth/permissions";
import { SESSION_COOKIE } from "../../../../../lib/auth/constants";
import { verifySessionToken } from "../../../../../lib/auth/session";
import { getSupabaseAdmin } from "../../../../../lib/supabaseAdmin";
import {
  geraetgruppeTableMissingResponse,
  loadVorlage,
  saveVorlage,
} from "../../../../../lib/geraetgruppe-protokoll-server.mjs";

async function sessionUsername() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;
  return session?.username ?? session?.user?.username ?? null;
}

export async function GET(_request, { params }) {
  if (!(await currentUserHasPermission("machines.read"))) {
    return NextResponse.json({ error: "Keine Berechtigung: machines.read" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { subgroup } = await params;
  const { data, error } = await loadVorlage(supabase, decodeURIComponent(subgroup));

  const missing = geraetgruppeTableMissingResponse(error);
  if (missing) return NextResponse.json(missing.body, { status: missing.status });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json(data);
}

export async function PUT(request, { params }) {
  if (!(await currentUserHasPermission("machines.write"))) {
    return NextResponse.json({ error: "Keine Berechtigung: machines.write" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { subgroup } = await params;
  const body = await request.json().catch(() => ({}));
  const username = await sessionUsername();

  const { data, error } = await saveVorlage(
    supabase,
    decodeURIComponent(subgroup),
    body,
    username
  );

  const missing = geraetgruppeTableMissingResponse(error);
  if (missing) return NextResponse.json(missing.body, { status: missing.status });
  if (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Speichern fehlgeschlagen." },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}
