import { dateForDatabaseStorage, formatGermanDate, germanDateComparable } from "./dates";
import { blocksFromDateKeys, expandBlockDateKeys } from "./urlaub-blocks";
import {
  ABSENCE_VARIANT_LABELS,
  normalizeUrlaubPortion,
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

export function blocksToDayEntries(blocks: UrlaubBlock[]) {
  const byDate = new Map<string, { variant: UrlaubBlockVariant; portion: 0.5 | 1 }>();
  for (const block of blocks) {
    const variant = normalizeUrlaubVariant(block.variant);
    if (!variant) continue;
    const portion = normalizeUrlaubPortion(block.portion);
    for (const dateKey of expandBlockDateKeys(block)) {
      byDate.set(dateKey, { variant, portion });
    }
  }
  return [...byDate.entries()].map(([dateKey, entry]) => ({
    dateKey,
    variant: entry.variant,
    portion: entry.portion,
  }));
}

export function dbRowsToBlocks(rows: Array<{ datum?: unknown; variant?: unknown; portion?: unknown }>) {
  const halfBlocks: UrlaubBlock[] = [];
  const fullKeysByVariant = new Map<UrlaubBlockVariant, Set<string>>();

  for (const row of rows) {
    const dateKey = isoKeyFromStoredDatum(row.datum);
    const variant = normalizeUrlaubVariant(row.variant);
    if (!dateKey || !variant) continue;
    const portion = normalizeUrlaubPortion(row.portion);

    if (portion === 0.5) {
      halfBlocks.push({
        startKey: dateKey,
        endKey: dateKey,
        label: `${ABSENCE_VARIANT_LABELS[variant]} ½`,
        variant,
        portion: 0.5,
      });
      continue;
    }

    const bucket = fullKeysByVariant.get(variant) ?? new Set<string>();
    bucket.add(dateKey);
    fullKeysByVariant.set(variant, bucket);
  }

  const blocks: UrlaubBlock[] = [...halfBlocks];
  for (const [variant, keys] of fullKeysByVariant) {
    blocks.push(...blocksFromDateKeys(keys, variant));
  }
  return blocks.sort((a, b) => a.startKey.localeCompare(b.startKey));
}

export function blocksToDbRows(username: string, blocks: UrlaubBlock[]) {
  const name = String(username ?? "").trim().toLowerCase();
  if (!name) return [];

  const now = new Date().toISOString();
  return blocksToDayEntries(blocks)
    .map(({ dateKey, variant, portion }) => {
      const datum = storedDatumFromIsoKey(dateKey);
      if (!datum) return null;
      return {
        username: name,
        datum,
        variant,
        portion,
        updated_at: now,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);
}

export function attachBlocksToUrlaubUsers(
  users: UrlaubTimelineUser[],
  rows: Array<{ username?: unknown; datum?: unknown; variant?: unknown; portion?: unknown }>
) {
  const rowsByUser = new Map<
    string,
    Array<{ datum?: unknown; variant?: unknown; portion?: unknown }>
  >();

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

export function isMissingUrlaubPortionColumn(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: unknown }).message ?? "").toLowerCase();
  return message.includes("portion") && message.includes("does not exist");
}

export function stripPortionFromRows(rows: Array<Record<string, unknown>>) {
  return rows.map(({ portion: _portion, ...row }) => row);
}
