/** Főoldal: minden görgetés az egész oldalt mozgatja (Safari + régi CSS cache ellen is). */

const SIDEBAR_SELECTOR =
  ".home-info-sidebar, .home-filter-sidebar, .home-filter-card, .home-filter-form, .home-partner-results";

function stripSidebarScrollContainers() {
  for (const el of document.querySelectorAll(SIDEBAR_SELECTOR)) {
    el.style.setProperty("overflow", "visible", "important");
    el.style.setProperty("max-height", "none", "important");
    el.style.setProperty("height", "auto", "important");
    el.style.setProperty("position", "static", "important");
  }
}

export function initHomeUnifiedScroll() {
  if (!document.body.classList.contains("home-page")) return;

  stripSidebarScrollContainers();

  // Partner ajánlók betöltése után is (dinamikus tartalom)
  const observer = new MutationObserver(() => stripSidebarScrollContainers());
  for (const sidebar of document.querySelectorAll(".home-info-sidebar, .home-filter-sidebar")) {
    observer.observe(sidebar, { childList: true, subtree: true, attributes: true });
  }

  document.addEventListener(
    "wheel",
    (event) => {
      if (event.target.closest(".home-category-track")) return;

      const inSidebar = event.target.closest(SIDEBAR_SELECTOR);
      if (inSidebar) {
        window.scrollBy({ top: event.deltaY, left: 0, behavior: "auto" });
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }

      let node = event.target;
      while (node && node !== document.body) {
        if (node.id === "home-grid-viewport" || node.classList?.contains("home-grid-viewport")) {
          window.scrollBy({ top: event.deltaY, left: 0, behavior: "auto" });
          event.preventDefault();
          return;
        }
        const style = getComputedStyle(node);
        if (
          /(auto|scroll|overlay)/.test(style.overflowY) &&
          node.scrollHeight > node.clientHeight + 2 &&
          node.closest(".home-layout")
        ) {
          window.scrollBy({ top: event.deltaY, left: 0, behavior: "auto" });
          event.preventDefault();
          return;
        }
        node = node.parentElement;
      }
    },
    { passive: false, capture: true }
  );
}
