import { spanDaysInclusive, type TimelineDay } from "./austria-holidays";
import type { UrlaubBlock } from "./urlaub-timeline-users";

function nextDateKey(dateKey: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function urlaubDateKeysFromBlocks(blocks: UrlaubBlock[], days: TimelineDay[]) {
  const keys = new Set<string>();
  for (const block of blocks) {
    if (block.variant !== "urlaub" && block.variant !== "urlaub-plan") continue;
    const span = spanDaysInclusive(block.startKey, block.endKey, days);
    if (!span) continue;
    for (let index = span.start; index <= span.end; index += 1) {
      keys.add(days[index].dateKey);
    }
  }
  return keys;
}

export function blocksFromUrlaubDateKeys(dateKeys: Iterable<string>, variant: UrlaubBlock["variant"] = "urlaub") {
  const sorted = [...dateKeys].sort();
  if (sorted.length === 0) return [];

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
      label: startKey === endKey ? "Urlaub" : `Urlaub ${startKey.slice(8)}.–${endKey.slice(8)}.`,
      variant,
    });
    startKey = key;
    endKey = key;
  }

  blocks.push({
    startKey,
    endKey,
    label: startKey === endKey ? "Urlaub" : `Urlaub ${startKey.slice(8)}.–${endKey.slice(8)}.`,
    variant,
  });

  return blocks;
}

export function toggleUrlaubDay(blocks: UrlaubBlock[], dateKey: string, days: TimelineDay[]) {
  const keys = urlaubDateKeysFromBlocks(blocks, days);
  if (keys.has(dateKey)) {
    keys.delete(dateKey);
  } else {
    keys.add(dateKey);
  }
  const other = blocks.filter((block) => block.variant !== "urlaub" && block.variant !== "urlaub-plan");
  return [...other, ...blocksFromUrlaubDateKeys(keys)];
}

export function isDateMarkedUrlaub(blocks: UrlaubBlock[], dateKey: string, days: TimelineDay[]) {
  return urlaubDateKeysFromBlocks(blocks, days).has(dateKey);
}
