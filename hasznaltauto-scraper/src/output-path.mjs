import { join } from "path";
import { isListPageUrl } from "./links.mjs";
import { slugFromListUrl } from "./url-utils.mjs";

export function buildOutputPath(url, customOutput, cwd = process.cwd()) {
  if (customOutput) return customOutput;

  if (url && isListPageUrl(url)) {
    const slug = slugFromListUrl(url);
    const stamp = new Date().toISOString().slice(0, 10);
    return join(cwd, "output", `lista-${slug}-${stamp}.txt`);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return join(cwd, "output", `lista-megnyitott-${stamp}.txt`);
}
