#!/usr/bin/env node
import { join } from "path";
import { homedir } from "os";
import { startChromeWithDebugging } from "./chrome.mjs";

const url =
  process.argv[2] ||
  process.env.FUGVENY_URL ||
  "https://www.hasznaltauto.hu/";

const profile = join(homedir(), "Downloads", "fugveny", ".chrome-connect-profile");
const { chromePath, port } = startChromeWithDebugging(url, 9222, profile);
console.log(`Chrome indul: ${chromePath}`);
console.log(`Debug port: ${port}`);
console.log(`Profil: ${profile}`);
console.log("Oldd meg a Cloudflare-t, ha kell, majd: npm start -- --connect");
