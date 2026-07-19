import { saveListingToDb } from "./db-client.js";
import { createAdForm } from "./form-core.js";

createAdForm({
  mode: "wizard",
  onWizardComplete: async (formData) => {
    try {
      const saved = await saveListingToDb(formData, null, { status: "feladott" });
      const summary = document.getElementById("summary-text");
      if (summary && saved?.id) {
        const link = document.createElement("a");
        link.className = "listings-inline-link";
        link.href = `/listings.html?id=${saved.id}`;
        link.textContent = ` Megtekintés a hirdetések között (#${saved.id})`;
        summary.appendChild(document.createElement("br"));
        summary.appendChild(link);
      }
    } catch (error) {
      console.warn("Hirdetés mentése SQLite-ba:", error);
    }
  },
});
