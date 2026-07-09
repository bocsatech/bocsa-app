// ==UserScript==
// @name         WH TESZT — működik-e a Tampermonkey?
// @namespace    local-wh-test
// @version      1.0.0
// @description  Ha ezt látod jobb alul (piros WH), a Tampermonkey fut a willhaben-en.
// @match        *://www.willhaben.at/*
// @match        *://willhaben.at/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

(function () {
  if (window.__WH_TEST__) return;
  window.__WH_TEST__ = true;

  const btn = document.createElement('button');
  btn.textContent = 'WH TESZT ✓';
  btn.style.cssText =
    'position:fixed!important;bottom:24px!important;right:24px!important;z-index:2147483647!important;' +
    'background:#e00!important;color:#fff!important;font:bold 14px system-ui!important;' +
    'padding:12px 16px!important;border:3px solid #fff!important;border-radius:12px!important;' +
    'box-shadow:0 4px 20px rgba(0,0,0,.5)!important;cursor:pointer!important;';
  btn.onclick = () => alert('Tampermonkey MŰKÖDIK a willhaben-en! Most telepítsd a fő scriptet.');
  (document.body || document.documentElement).appendChild(btn);
  console.log('[WH-TESZT] Betöltve:', location.href);
})();
