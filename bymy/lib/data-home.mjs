/** Bymy tartós adatmappa — új: ~/.bymy, régi: ~/.autosweb (adatvesztés nélkül). */

import { existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";

const LEGACY_DIR_NAME = ".autosweb";
const DIR_NAME = ".bymy";

function dirHasDb(dir) {
  return existsSync(join(dir, "bymy.db")) || existsSync(join(dir, "autosweb.db"));
}

/**
 * Feloldja a tartós adatkönyvtárat.
 * - BYMY_DATA_DIR / AUTOSWEB_DATA_DIR env felülír
 * - ha ~/.autosweb-ben van DB → azt (meglévő adatok)
 * - ha ~/.bymy-ben van DB → azt
 * - ha csak az egyik mappa létezik → azt
 * - különben új ~/.bymy
 */
export function bymyHomeDir() {
  if (process.env.BYMY_DATA_DIR) return process.env.BYMY_DATA_DIR;
  if (process.env.AUTOSWEB_DATA_DIR) return process.env.AUTOSWEB_DATA_DIR;
  const next = join(homedir(), DIR_NAME);
  const legacy = join(homedir(), LEGACY_DIR_NAME);
  if (dirHasDb(legacy)) return legacy;
  if (dirHasDb(next)) return next;
  if (existsSync(legacy)) return legacy;
  if (existsSync(next)) return next;
  return next;
}

export function ensureBymyHomeDir() {
  const dir = bymyHomeDir();
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

/** Env: BYMY_* elsőbbség, AUTOSWEB_* visszafelé kompatibilis. */
export function envPath(...names) {
  for (const name of names) {
    const v = process.env[name];
    if (v) return v;
  }
  return null;
}

export function bymyDbFileName() {
  const dir = bymyHomeDir();
  const next = join(dir, "bymy.db");
  const legacy = join(dir, "autosweb.db");
  if (existsSync(next)) return "bymy.db";
  if (existsSync(legacy)) return "autosweb.db";
  return "bymy.db";
}
