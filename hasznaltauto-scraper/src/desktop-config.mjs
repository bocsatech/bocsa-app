import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { join } from "path";

const CONFIG_PATH = join(process.cwd(), "desktop-config.json");

const DEFAULT_CONFIG = {
  url: "https://www.hasznaltauto.hu/szemelyauto/tesla",
  fetchPhones: true,
  paginate: true,
};

export function readDesktopConfig() {
  try {
    const raw = JSON.parse(readFileSync(CONFIG_PATH, "utf8"));
    return {
      ...DEFAULT_CONFIG,
      ...raw,
      url: String(raw.url ?? DEFAULT_CONFIG.url).trim() || DEFAULT_CONFIG.url,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function writeDesktopConfig(partial) {
  const next = {
    ...readDesktopConfig(),
    ...partial,
  };

  if (partial.url !== undefined) {
    next.url = String(partial.url).trim() || DEFAULT_CONFIG.url;
  }

  mkdirSync(join(process.cwd(), "output"), { recursive: true });
  writeFileSync(CONFIG_PATH, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  return next;
}

export function getConfigPath() {
  return CONFIG_PATH;
}
