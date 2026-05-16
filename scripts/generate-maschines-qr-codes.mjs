import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { generateMachineQrCode } from "../lib/qr-code.mjs";

const TABLE = "maschines";

function readEnv(contents) {
  return Object.fromEntries(
    contents
      .split(/\r?\n/)
      .map((line) => line.match(/^([^#=]+)=(.*)$/))
      .filter(Boolean)
      .map((match) => [match[1].trim(), match[2].trim()])
  );
}

async function supabaseRequest(url, key, endpoint, options = {}) {
  const response = await fetch(`${url}/rest/v1/${endpoint}`, {
    ...options,
    headers: {
      apikey: key,
      authorization: `Bearer ${key}`,
      "content-type": "application/json",
      prefer: "return=representation",
      ...options.headers,
    },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`${options.method ?? "GET"} ${endpoint} fehlgeschlagen (${response.status}): ${body}`);
  }

  return body ? JSON.parse(body) : null;
}

const env = readEnv(await readFile(path.join(process.cwd(), ".env.local"), "utf8"));
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const appUrl =
  env.NEXT_PUBLIC_APP_URL ||
  "https://bocsa-app-bocsarobert-3405s-projects.vercel.app";

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY / ANON_KEY fehlt."
  );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const machines = await supabaseRequest(
  supabaseUrl,
  supabaseKey,
  `${TABLE}?select=*&order=created_at.asc`
);

let generated = 0;
for (const machine of machines ?? []) {
  const { publicPath, targetUrl } = await generateMachineQrCode(machine, appUrl, {
    supabase,
  });
  await supabaseRequest(
    supabaseUrl,
    supabaseKey,
    `${TABLE}?id=eq.${encodeURIComponent(machine.id)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ qr_code: publicPath }),
    }
  );
  generated += 1;
  console.log(`${machine.geraetenummer ?? machine.id}: ${publicPath} -> ${targetUrl}`);
}

console.log(`QR-Codes generiert: ${generated}`);
