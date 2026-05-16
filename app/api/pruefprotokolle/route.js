import { NextResponse } from "next/server";
import { getCurrentSession } from "../../../lib/auth/permissions";
import { getSupabaseAdmin } from "../../../lib/supabaseAdmin";

const MACHINE_TABLE = "maschines";

function normalizeMachine(row) {
  if (!row) return null;
  const tab = row.machine_tab_data ?? {};
  return {
    id: row.id,
    geraetenummer: row.geraetenummer ?? "",
    bezeichnung: row.bezeichnung ?? row.beschreibung ?? "",
    depot: row.depot ?? "",
    geraettyp: row.geraettyp ?? tab.geraettyp ?? "",
    machine_tab_data: tab,
  };
}

function collectEntries(machines) {
  const entries = [];
  for (const machine of machines) {
    const list = machine.machine_tab_data?.pruefprotokolle;
    if (!Array.isArray(list)) continue;
    for (const raw of list) {
      if (!raw || typeof raw !== "object") continue;
      const geraetedaten = raw.geraetedaten ?? {};
      entries.push({
        id: String(raw.id ?? ""),
        machineId: machine.id,
        geraetenummer: String(
          machine.geraetenummer ?? geraetedaten.geraetenummer ?? ""
        ),
        filiale: String(machine.depot ?? geraetedaten.betreiber ?? ""),
        geraettyp: String(machine.geraettyp ?? ""),
        bezeichnung: String(machine.bezeichnung ?? ""),
        pruefdatum: String(raw.pruefdatum ?? geraetedaten.pruefdatum ?? ""),
        updatedAt: String(raw.updatedAt ?? raw.createdAt ?? ""),
        createdBy: String(raw.createdBy ?? ""),
        updatedBy: String(raw.updatedBy ?? ""),
      });
    }
  }
  return entries.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));
}

function normalizeFilter(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function toIsoDate(value) {
  const trimmed = String(value ?? "").trim();
  const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  return "";
}

export async function GET(request) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const db = getSupabaseAdmin();
  if (!db) {
    return NextResponse.json({ error: "Supabase nicht konfiguriert." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const geraetenummer = normalizeFilter(searchParams.get("geraetenummer"));
  const user = normalizeFilter(searchParams.get("user"));
  const filiale = normalizeFilter(searchParams.get("filiale"));
  const geraettyp = normalizeFilter(searchParams.get("geraettyp"));
  const dateFrom = toIsoDate(searchParams.get("dateFrom"));
  const dateTo = toIsoDate(searchParams.get("dateTo"));

  const { data, error } = await db.from(MACHINE_TABLE).select(
    "id, geraetenummer, bezeichnung, beschreibung, depot, geraettyp, machine_tab_data"
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let entries = collectEntries((data ?? []).map(normalizeMachine).filter(Boolean));

  entries = entries.filter((entry) => {
    if (geraetenummer && !normalizeFilter(entry.geraetenummer).includes(geraetenummer)) {
      return false;
    }
    if (user) {
      const label = normalizeFilter(entry.updatedBy || entry.createdBy);
      if (!label.includes(user)) return false;
    }
    if (filiale && !normalizeFilter(entry.filiale).includes(filiale)) {
      return false;
    }
    if (geraettyp && !normalizeFilter(entry.geraettyp).includes(geraettyp)) {
      return false;
    }
    const iso = toIsoDate(entry.pruefdatum);
    if (dateFrom && (!iso || iso < dateFrom)) return false;
    if (dateTo && (!iso || iso > dateTo)) return false;
    return true;
  });

  return NextResponse.json(entries, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
