// Content script — inject page-bridge into the Willhaben page world
(function inject() {
  const s = document.createElement('script');
  s.src = chrome.runtime.getURL('page-bridge.js');
  s.onload = () => s.remove();
  (document.documentElement || document.head).appendChild(s);
})();
