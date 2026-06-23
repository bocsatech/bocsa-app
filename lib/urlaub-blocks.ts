import { spanDaysInclusive, type TimelineDay } from "./austria-holidays";
import {
  ABSENCE_VARIANT_LABELS,
  type UrlaubBlock,
  type UrlaubBlockVariant,
} from "./urlaub-timeline-users";

function nextDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}


export function dateKeysForBlock(block: UrlaubBlock, days: TimelineDay[]) {
  const span = spanDaysInclusive(block.startKey, block.endKey, days);
  if (!span) return [];
  const keys: string[] = [];
  for (let index = span.start; index <= span.end; index += 1) {
    keys.push(days[index].dateKey);
  }
  return keys;
}

export function dateKeysFromBlocks(blocks: UrlaubBlock[], days: TimelineDay[], variants?: UrlaubBlockVariant[]) {
  const allowed = variants ? new Set(variants) : null;
  const keys = new Set<string>();
  for (const block of blocks) {
    if (allowed && !allowed.has(block.variant)) continue;
    for (const key of dateKeysForBlock(block, days)) {
      keys.add(key);
    }
  }
  return keys;
}

export function dateKeysInInclusiveRange(startKey: string, endKey: string, days: TimelineDay[]) {
  const startIndex = days.findIndex((day) => day.dateKey === startKey);
  const endIndex = days.findIndex((day) => day.dateKey === endKey);
  if (startIndex < 0 || endIndex < 0) return [];
  const from = Math.min(startIndex, endIndex);
  const to = Math.max(startIndex, endIndex);
  return days.slice(from, to + 1).map((day) => day.dateKey);
}

export function blocksFromDateKeys(dateKeys: Iterable<string>, variant: UrlaubBlockVariant) {
  const sorted = [...dateKeys].sort();
  if (sorted.length === 0) return [];

  const label = ABSENCE_VARIANT_LABELS[variant];
  const blocks: UrlaubBlock[] = [];
  let startKey = sorted[0];
  let endKey = sorted[0];

  for (let index = 1; index < sorted.length; index += 1) {
    const key = sorted[index];
    if (key === nextDateKey(endKey)) {
      endKey = key;
      continue;
    }
    blocks.push({
      startKey,
      endKey,
      label: startKey === endKey ? label : `${label} ${startKey.slice(8)}.–${endKey.slice(8)}.`,
      variant,
    });
    startKey = key;
    endKey = key;
  }

  blocks.push({
    startKey,
    endKey,
    label: startKey === endKey ? label : `${label} ${startKey.slice(8)}.–${endKey.slice(8)}.`,
    variant,
  });

  return blocks;
}

export function removeDateKeysFromBlocks(blocks: UrlaubBlock[], removeKeys: Set<string>, days: TimelineDay[]) {
  if (removeKeys.size === 0) return blocks;

  const keptKeysByVariant = new Map<UrlaubBlockVariant, Set<string>>();

  for (const block of blocks) {
    const existing = keptKeysByVariant.get(block.variant) ?? new Set<string>();
    for (const key of dateKeysForBlock(block, days)) {
      if (!removeKeys.has(key)) existing.add(key);
    }
    keptKeysByVariant.set(block.variant, existing);
  }

  const next: UrlaubBlock[] = [];
  for (const [variant, keys] of keptKeysByVariant) {
    next.push(...blocksFromDateKeys(keys, variant));
  }
  return next;
}

export function applyVariantToDateKeys(
  blocks: UrlaubBlock[],
  dateKeys: string[],
  variant: UrlaubBlockVariant,
  days: TimelineDay[]
) {
  const target = new Set(dateKeys);
  if (target.size === 0) return blocks;
  const withoutOverlap = removeDateKeysFromBlocks(blocks, target, days);
  return [...withoutOverlap, ...blocksFromDateKeys(target, variant)];
}

export function toggleUrlaubDay(blocks: UrlaubBlock[], dateKey: string, days: TimelineDay[]) {
  const urlaubKeys = dateKeysFromBlocks(blocks, days, ["urlaub", "urlaub-plan"]);
  if (urlaubKeys.has(dateKey)) {
    return removeDateKeysFromBlocks(blocks, new Set([dateKey]), days);
  }
  return applyVariantToDateKeys(blocks, [dateKey], "urlaub", days);
}

export function variantForDate(blocks: UrlaubBlock[], dateKey: string, days: TimelineDay[]) {
  for (const block of blocks) {
    const span = spanDaysInclusive(block.startKey, block.endKey, days);
    if (!span) continue;
    for (let index = span.start; index <= span.end; index += 1) {
      if (days[index].dateKey === dateKey) return block.variant;
    }
  }
  return null;
}

export function isDateMarked(blocks: UrlaubBlock[], dateKey: string, days: TimelineDay[]) {
  return variantForDate(blocks, dateKey, days) !== null;
}

export function countUrlaubDaysInYear(blocks: UrlaubBlock[], days: TimelineDay[], year: number) {
  let count = 0;
  for (const block of blocks) {
    if (block.variant !== "urlaub") continue;
    for (const key of dateKeysForBlock(block, days)) {
      if (Number(key.slice(0, 4)) === year) count += 1;
    }
  }
  return count;
}

/** @deprecated use isDateMarked */
export function isDateMarkedUrlaub(blocks: UrlaubBlock[], dateKey: string, days: TimelineDay[]) {
  return isDateMarked(blocks, dateKey, days);
}

export function mergeSelectionKeys(anchorKey: string, focusKey: string, days: TimelineDay[]) {
  return dateKeysInInclusiveRange(anchorKey, focusKey, days);
}

export function extendSelectionWithRange(selected: Set<string>, startKey: string, endKey: string, days: TimelineDay[]) {
  const next = new Set(selected);
  for (const key of dateKeysInInclusiveRange(startKey, endKey, days)) {
    next.add(key);
  }
  return next;
}

export function dayIndexForKey(days: TimelineDay[], dateKey: string) {
  return days.findIndex((day) => day.dateKey === dateKey);
}

export function dateKeyAtIndex(days: TimelineDay[], index: number) {
  if (index < 0 || index >= days.length) return null;
  return days[index].dateKey;
}

export function indexFromPointer(clientX: number, rowLeft: number, scrollLeft: number) {
  const x = clientX - rowLeft + scrollLeft;
  return Math.max(0, Math.floor(x / 40));
}
