import { dateKeyFromDate } from "./austria-holidays.ts";
import { summarizeUrlaubQuotaFromBlocks } from "./urlaub-blocks.ts";
import {
  ANNUAL_URLAUB_DAYS,
  formatUrlaubQuotaValue,
} from "./urlaub-timeline-users.ts";
import {
  dbRowsToBlocks,
  isMissingUrlaubPortionColumn,
  isMissingUrlaubTablesError,
} from "./urlaub-db.ts";

const URLAUB_SELECT_WITH_PORTION = "datum, variant, portion";
const URLAUB_SELECT_LEGACY = "datum, variant";

export async function loadUrlaubQuotaForUsername(db, username) {
  const year = new Date().getFullYear();
  const todayKey = dateKeyFromDate(new Date());
  const empty = {
    year,
    taken: 0,
    planned: 0,
    total: 0,
    remaining: ANNUAL_URLAUB_DAYS,
    annualDays: ANNUAL_URLAUB_DAYS,
    formatted: {
      taken: formatUrlaubQuotaValue(0),
      planned: formatUrlaubQuotaValue(0),
      remaining: formatUrlaubQuotaValue(ANNUAL_URLAUB_DAYS),
      annualDays: formatUrlaubQuotaValue(ANNUAL_URLAUB_DAYS),
    },
  };

  if (!db || !username) {
    return empty;
  }

  let { data, error } = await db
    .from("urlaub_tage")
    .select(URLAUB_SELECT_WITH_PORTION)
    .eq("username", String(username).trim().toLowerCase());

  if (error && isMissingUrlaubPortionColumn(error)) {
    ({ data, error } = await db
      .from("urlaub_tage")
      .select(URLAUB_SELECT_LEGACY)
      .eq("username", String(username).trim().toLowerCase()));
  }

  if (error) {
    if (isMissingUrlaubTablesError(error)) {
      return empty;
    }
    return { ...empty, error: error.message };
  }

  const blocks = dbRowsToBlocks(data ?? []);
  const quota = summarizeUrlaubQuotaFromBlocks(blocks, year, todayKey, ANNUAL_URLAUB_DAYS);

  return {
    ...quota,
    annualDays: ANNUAL_URLAUB_DAYS,
    formatted: {
      taken: formatUrlaubQuotaValue(quota.taken),
      planned: formatUrlaubQuotaValue(quota.planned),
      remaining: formatUrlaubQuotaValue(quota.remaining),
      annualDays: formatUrlaubQuotaValue(ANNUAL_URLAUB_DAYS),
    },
  };
}

export function normalizeOvertimeHours(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.round(numeric * 100) / 100;
}
