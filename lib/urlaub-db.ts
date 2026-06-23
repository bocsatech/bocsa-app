import { dateForDatabaseStorage, formatGermanDate, germanDateComparable } from "./dates";
import { blocksFromDateKeys } from "./urlaub-blocks";
import {
  type UrlaubBlock,
  type UrlaubBlockVariant,
  type UrlaubTimelineUser,
} from "./urlaub-timeline-users";

const VALID_VARIANTS = new Set<UrlaubBlockVariant>([
  "urlaub",
  "urlaub-plan",
  "zeitausgleich",
  "sonderurlaub",
  "krankenstand",
  "pflegeurlaub",
]);

function nextDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function isoKeyFromStoredDatum(datum: unknown) {
  const comparable = germanDateComparable(datum);
  return comparable || null;
}

export function storedDatumFromIsoKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  if (!y || !m || !d) return null;
  return dateForDatabaseStorage(formatGermanDate(new Date(y, m - 1, d)));
}

export function normalizeUrlaubVariant(value: unknown): UrlaubBlockVariant | null {
  const variant = String(value ?? "").trim() as UrlaubBlockVariant;
  return VALID_VARIANTS.has(variant) ? variant : null;
}

export function expandBlockToDateKeys(block: UrlaubBlock) {
  const keys: string[] = [];
  let current = block.startKey;
  while (current <= block.endKey) {
    keys.push(current);
    if (current === block.endKey) break;
    current = nextDateKey(current);
  }
  return keys;
}

export function blocksToDayEntries(blocks: UrlaubBlock[]) {
  const byDate = new Map<string, UrlaubBlockVariant>();
  for (const block of blocks) {
    const variant = normalizeUrlaubVariant(block.variant);
    if (!variant) continue;
    for (const dateKey of expandBlockToDateKeys(block)) {
      byDate.set(dateKey, variant);
    }
  }
  return [...byDate.entries()].map(([dateKey, variant]) => ({ dateKey, variant }));
}

export function dbRowsToBlocks(rows: Array<{ datum?: unknown; variant?: unknown }>) {
  const keysByVariant = new Map<UrlaubBlockVariant, Set<string>>();

  for (const row of rows) {
    const dateKey = isoKeyFromStoredDatum(row.datum);
    const variant = normalizeUrlaubVariant(row.variant);
    if (!dateKey || !variant) continue;
    const bucket = keysByVariant.get(variant) ?? new Set<string>();
    bucket.add(dateKey);
    keysByVariant.set(variant, bucket);
  }

  const blocks: UrlaubBlock[] = [];
  for (const [variant, keys] of keysByVariant) {
    blocks.push(...blocksFromDateKeys(keys, variant));
  }
  return blocks.sort((a, b) => a.startKey.localeCompare(b.startKey));
}

export function blocksToDbRows(username: string, blocks: UrlaubBlock[]) {
  const name = String(username ?? "").trim().toLowerCase();
  if (!name) return [];

  const now = new Date().toISOString();
  return blocksToDayEntries(blocks)
    .map(({ dateKey, variant }) => {
      const datum = storedDatumFromIsoKey(dateKey);
      if (!datum) return null;
      return {
        username: name,
        datum,
        variant,
        updated_at: now,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export function attachBlocksToUrlaubUsers(
  users: UrlaubTimelineUser[],
  rows: Array<{ username?: unknown; datum?: unknown; variant?: unknown }>
) {
  const rowsByUser = new Map<string, Array<{ datum?: unknown; variant?: unknown }>>();

  for (const row of rows) {
    const username = String(row.username ?? "").trim().toLowerCase();
    if (!username) continue;
    const bucket = rowsByUser.get(username) ?? [];
    bucket.push(row);
    rowsByUser.set(username, bucket);
  }

  return users.map((user) => ({
    ...user,
    blocks: dbRowsToBlocks(rowsByUser.get(user.username.trim().toLowerCase()) ?? []),
  }));
}

export function isMissingUrlaubTablesError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = String((error as { code?: unknown }).code ?? "");
  const message = String((error as { message?: unknown }).message ?? "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("urlaub_tage")
  );
}
