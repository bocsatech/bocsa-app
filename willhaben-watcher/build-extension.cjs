#!/usr/bin/env node
/** Userscript → Chrome extension content.js szinkron */
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'willhaben-watcher.user.js'), 'utf8');
const body = src.replace(/^\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==\s*/m, '');
fs.writeFileSync(path.join(__dirname, 'chrome-extension', 'content.js'), body);
console.log('chrome-extension/content.js frissítve');
