import { spanDaysInclusive, type TimelineDay } from "./austria-holidays";
import {
  ABSENCE_VARIANT_LABELS,
  ANNUAL_URLAUB_DAYS,
  normalizeUrlaubPortion,
  type UrlaubBlock,
  type UrlaubBlockVariant,
  type UrlaubPortion,
} from "./urlaub-timeline-users";

function nextDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function expandBlockDateKeys(block: UrlaubBlock) {
  const keys: string[] = [];
  let current = block.startKey;
  while (current <= block.endKey) {
    keys.push(current);
    if (current === block.endKey) break;
    current = nextDateKey(current);
  }
  return keys;
}

export function blockPortion(block: UrlaubBlock): UrlaubPortion {
  return normalizeUrlaubPortion(block.portion);
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
      portion: 1,
    });
    startKey = key;
    endKey = key;
  }

  blocks.push({
    startKey,
    endKey,
    label: startKey === endKey ? label : `${label} ${startKey.slice(8)}.–${endKey.slice(8)}.`,
    variant,
    portion: 1,
  });

  return blocks;
}

function halfDayBlocksFromDateKeys(dateKeys: Iterable<string>, variant: UrlaubBlockVariant) {
  const label = `${ABSENCE_VARIANT_LABELS[variant]} ½`;
  return [...dateKeys]
    .sort()
    .map((dateKey) => ({
      startKey: dateKey,
      endKey: dateKey,
      label,
      variant,
      portion: 0.5 as const,
    }));
}

export function removeDateKeysFromBlocks(blocks: UrlaubBlock[], removeKeys: Set<string>, days: TimelineDay[]) {
  if (removeKeys.size === 0) return blocks;

  const keptFullKeysByVariant = new Map<UrlaubBlockVariant, Set<string>>();
  const keptHalfBlocks: UrlaubBlock[] = [];

  for (const block of blocks) {
    if (blockPortion(block) === 0.5) {
      if (!removeKeys.has(block.startKey)) {
        keptHalfBlocks.push(block);
      }
      continue;
    }

    const existing = keptFullKeysByVariant.get(block.variant) ?? new Set<string>();
    for (const key of dateKeysForBlock(block, days)) {
      if (!removeKeys.has(key)) existing.add(key);
    }
    keptFullKeysByVariant.set(block.variant, existing);
  }

  const next: UrlaubBlock[] = [...keptHalfBlocks];
  for (const [variant, keys] of keptFullKeysByVariant) {
    next.push(...blocksFromDateKeys(keys, variant));
  }
  return next;
}

export function applyVariantToDateKeys(
  blocks: UrlaubBlock[],
  dateKeys: string[],
  variant: UrlaubBlockVariant,
  days: TimelineDay[],
  portion: UrlaubPortion = 1
) {
  const target = new Set(dateKeys);
  if (target.size === 0) return blocks;
  const withoutOverlap = removeDateKeysFromBlocks(blocks, target, days);
  if (portion === 0.5) {
    return [...withoutOverlap, ...halfDayBlocksFromDateKeys(target, variant)];
  }
  return [...withoutOverlap, ...blocksFromDateKeys(target, variant)];
}

export function toggleUrlaubDay(blocks: UrlaubBlock[], dateKey: string, days: TimelineDay[]) {
  const urlaubKeys = dateKeysFromBlocks(blocks, days, ["urlaub", "urlaub-plan"]);
  if (urlaubKeys.has(dateKey)) {
    return removeDateKeysFromBlocks(blocks, new Set([dateKey]), days);
  }
  return applyVariantToDateKeys(blocks, [dateKey], "urlaub", days, 1);
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
    const portion = blockPortion(block);
    for (const key of dateKeysForBlock(block, days)) {
      if (Number(key.slice(0, 4)) === year) count += portion;
    }
  }
  return count;
}

export type UrlaubQuotaSummary = {
  year: number;
  taken: number;
  planned: number;
  total: number;
  remaining: number;
};

function addUrlaubPortionForKey(
  block: UrlaubBlock,
  key: string,
  year: number,
  todayKey: string,
  taken: { value: number },
  planned: { value: number }
) {
  if (block.variant !== "urlaub" && block.variant !== "urlaub-plan") return;
  if (Number(key.slice(0, 4)) !== year) return;
  const portion = blockPortion(block);
  if (block.variant === "urlaub-plan" || key > todayKey) {
    planned.value += portion;
  } else {
    taken.value += portion;
  }
}

export function summarizeUrlaubQuotaFromBlocks(
  blocks: UrlaubBlock[],
  year: number,
  todayKey: string,
  annualDays: number = ANNUAL_URLAUB_DAYS
): UrlaubQuotaSummary {
  const taken = { value: 0 };
  const planned = { value: 0 };

  for (const block of blocks) {
    for (const key of expandBlockDateKeys(block)) {
      addUrlaubPortionForKey(block, key, year, todayKey, taken, planned);
    }
  }

  const total = taken.value + planned.value;
  return {
    year,
    taken: taken.value,
    planned: planned.value,
    total,
    remaining: Math.max(0, annualDays - total),
  };
}

export function summarizeUrlaubQuotaInYear(
  blocks: UrlaubBlock[],
  days: TimelineDay[],
  year: number,
  todayKey: string,
  annualDays: number
): UrlaubQuotaSummary {
  const taken = { value: 0 };
  const planned = { value: 0 };

  for (const block of blocks) {
    for (const key of dateKeysForBlock(block, days)) {
      addUrlaubPortionForKey(block, key, year, todayKey, taken, planned);
    }
  }

  const total = taken.value + planned.value;
  return {
    year,
    taken: taken.value,
    planned: planned.value,
    total,
    remaining: Math.max(0, annualDays - total),
  };
}

export function exceedsAnnualUrlaubQuota(
  blocks: UrlaubBlock[],
  year: number,
  todayKey: string,
  annualDays: number = ANNUAL_URLAUB_DAYS
) {
  return summarizeUrlaubQuotaFromBlocks(blocks, year, todayKey, annualDays).total > annualDays;
}

export function wouldExceedUrlaubQuotaAfterApply(
  blocks: UrlaubBlock[],
  dateKeys: string[],
  variant: UrlaubBlockVariant,
  days: TimelineDay[],
  year: number,
  todayKey: string,
  annualDays: number,
  portion: UrlaubPortion = 1
) {
  if (variant !== "urlaub" && variant !== "urlaub-plan") return false;
  const nextBlocks = applyVariantToDateKeys(blocks, dateKeys, variant, days, portion);
  return exceedsAnnualUrlaubQuota(nextBlocks, year, todayKey, annualDays);
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

export function blockLayoutStyle(block: UrlaubBlock, days: { dateKey: string }[], columnWidth: number) {
  const start = days.findIndex((day) => day.dateKey === block.startKey);
  const end = days.findIndex((day) => day.dateKey === block.endKey);
  if (start < 0 || end < 0) return null;

  const portion = blockPortion(block);
  if (portion === 0.5 && block.startKey === block.endKey) {
    return {
      left: start * columnWidth + 4,
      width: columnWidth / 2 - 6,
    };
  }

  return {
    left: start * columnWidth + 4,
    width: (end - start + 1) * columnWidth - 8,
  };
}
