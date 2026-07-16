import { createInterface } from "readline/promises";
import { stdin as input, stdout as output } from "process";
import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { isListPageUrl, slugFromListUrl } from "./links.mjs";
import { scrapeUrl } from "./scrape.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf8"));

function parseArgs(argv) {
  const options = {
    url: null,
    output: null,
    headed: false,
    connect: false,
    deep: false,
    debug: false,
    linkFile: join(process.cwd(), "link.txt"),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--headed") {
      options.headed = true;
      continue;
    }
    if (arg === "--connect") {
      options.connect = true;
      continue;
    }
    if (arg === "--deep") {
      options.deep = true;
      continue;
    }
    if (arg === "--debug") {
      options.debug = true;
      continue;
    }
    if (arg === "--output" || arg === "-o") {
      options.output = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === "--link-file") {
      options.linkFile = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg.startsWith("http")) {
      options.url = arg;
    }
  }

  return options;
}

function readLinkFromFile(path) {
  try {
    const content = readFileSync(path, "utf8");
    const line = content
      .split(/\r?\n/)
      .map((entry) => entry.trim())
      .find((entry) => entry && !entry.startsWith("#"));
    return line ?? null;
  } catch {
    return null;
  }
}

function buildOutputPath(url, customOutput) {
  if (customOutput) return customOutput;

  if (url && isListPageUrl(url)) {
    const slug = slugFromListUrl(url);
    const stamp = new Date().toISOString().slice(0, 10);
    return join(process.cwd(), "output", `lista-${slug}-${stamp}.txt`);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  return join(process.cwd(), "output", `lista-megnyitott-${stamp}.txt`);
}

async function resolveUrl(options) {
  if (options.url) return options.url;
  if (options.connect) return null;

  const fromFile = readLinkFromFile(options.linkFile);
  if (fromFile) return fromFile;

  const rl = createInterface({ input, output });
  const typed = await rl.question("Illeszd be a hasznaltauto.hu linket (lista vagy hirdetés): ");
  rl.close();
  return typed.trim();
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const url = await resolveUrl(options);

  console.log(`hasznaltauto-scraper v${pkg.version}`);

  if (options.connect) {
    console.log("Mód: megnyitott Chrome lap használata (--connect)");
  } else if (url) {
    console.log(isListPageUrl(url) ? "Lista oldal feldolgozása:" : "Hirdetés feldolgozása:", url);
  }

  const result = await scrapeUrl(url, {
    connect: options.connect,
    deep: options.deep,
    headless: !options.headed,
    debug: options.debug,
    onProgress: (message) => console.log(message),
  });

  const outputPath = buildOutputPath(url ?? result.listUrl, options.output);
  mkdirSync(join(process.cwd(), "output"), { recursive: true });
  writeFileSync(outputPath, `${result.text}\n`, "utf8");

  console.log("\n" + result.text);
  console.log(`\nMentve: ${outputPath}`);
}

main().catch((error) => {
  console.error("Hiba:", error.message ?? error);
  process.exit(1);
});
