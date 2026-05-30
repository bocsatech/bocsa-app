#!/usr/bin/env node
/**
 * Gerätegruppe aus Gerätenummer (Demo / Prüfung).
 * Beispiel: node scripts/derive-geraetegruppe.mjs KB-GG-BG2-00001
 */
import { deriveGeraetegruppeFromGeraetenummer } from "../lib/geraetenummer.ts";

const input = process.argv[2] ?? "KB-GG-BG2-00001";
const gruppe = deriveGeraetegruppeFromGeraetenummer(input);
console.log(`Gerätenummer: ${input}`);
console.log(`Gerätegruppe: ${gruppe || "(nicht strukturiert)"}`);
