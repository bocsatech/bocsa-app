#!/usr/bin/env node
import { runMentesmarka } from "./mentesmarka.mjs";

await runMentesmarka(["--connect", ...process.argv.slice(2)]);
