import { NextResponse } from "next/server";
import { currentUserHasPermission } from "../../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../../lib/supabaseAdmin";
import {
  geraetgruppeTableMissingResponse,
  listAllVorlagen,
  listDistinctSubgroupsFromMachines,
} from "../../../../lib/geraetgruppe-protokoll-server.mjs";

export async function GET() {
  if (!(await currentUserHasPermission("machines.read"))) {
    return NextResponse.json({ error: "Keine Berechtigung: machines.read" }, { status: 403 });
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const [templatesRes, machinesRes] = await Promise.all([
    listAllVorlagen(supabase),
    listDistinctSubgroupsFromMachines(supabase),
  ]);

  const missing = geraetgruppeTableMissingResponse(templatesRes.error);
  if (missing) {
    return NextResponse.json(missing.body, { status: missing.status });
  }

  if (machinesRes.error) {
    return NextResponse.json({ error: machinesRes.error.message }, { status: 500 });
  }

  return NextResponse.json({
    templates: templatesRes.data ?? [],
    subgroupsFromMachines: machinesRes.data ?? [],
  });
}
