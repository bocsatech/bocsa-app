#!/usr/bin/env node
import { runMentesmarka } from "./mentesmarka.mjs";

// Alap: --fresh (előlről, előző mentés nélkül) + Tipus AJAX várakozás
await runMentesmarka(["--connect", "--fresh", ...process.argv.slice(2)]);
