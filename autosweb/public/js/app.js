import { saveListingToDb, getStoredListingId } from "./db-client.js";
import { createAdForm } from "./form-core.js";
import { initSiteSideContent } from "./site-side-content.js";

createAdForm({
  mode: "wizard",
  onWizardComplete: async (formData) => {
    try {
      const listingId = getStoredListingId();
      const saved = await saveListingToDb(formData, listingId, { status: "feladott" });
      const summary = document.getElementById("summary-text");
      if (summary && saved?.id) {
        const homeLink = document.createElement("a");
        homeLink.className = "listings-inline-link";
        homeLink.href = "/";
        homeLink.textContent = ` Megtekintés a főoldalon (#${saved.id})`;
        summary.appendChild(document.createElement("br"));
        summary.appendChild(homeLink);

        const listLink = document.createElement("a");
        listLink.className = "listings-inline-link";
        listLink.href = `/listings.html?id=${saved.id}`;
        listLink.textContent = ` Hirdetések admin (#${saved.id})`;
        summary.appendChild(document.createElement("br"));
        summary.appendChild(listLink);
      }
    } catch (error) {
      console.warn("Hirdetés mentése SQLite-ba:", error);
      const summary = document.getElementById("summary-text");
      if (summary) {
        summary.appendChild(document.createElement("br"));
        summary.appendChild(document.createTextNode(` Mentés hiba: ${error.message ?? error}`));
      }
    }
  },
});

initSiteSideContent().catch(console.error);
