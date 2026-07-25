/** Főoldal: oldalsáv felett a görgetés mindig az egész oldalt mozgatja. */

function isNestedScrollContainer(element) {
  let node = element;
  while (node && node !== document.body) {
    const style = getComputedStyle(node);
    const overflowY = style.overflowY;
    if (/(auto|scroll|overlay)/.test(overflowY) && node.scrollHeight > node.clientHeight + 1) {
      return true;
    }
    node = node.parentElement;
  }
  return false;
}

export function initHomeUnifiedScroll() {
  const layout = document.querySelector(".home-layout");
  if (!layout) return;

  layout.addEventListener(
    "wheel",
    (event) => {
      const inSidebar = event.target.closest(".home-info-sidebar, .home-filter-sidebar");
      if (!inSidebar) return;
      if (isNestedScrollContainer(event.target)) return;

      window.scrollBy({ top: event.deltaY, left: 0, behavior: "auto" });
      event.preventDefault();
    },
    { passive: false, capture: true }
  );
}
