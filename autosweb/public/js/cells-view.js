export const STEP_TITLES = {
  1: "Alapadatok",
  2: "Műszaki adatok",
  3: "Extrák",
  5: "Hirdetés",
};

export function groupCellsByStep(cells) {
  const groups = new Map();
  for (const cell of cells ?? []) {
    const step = cell.step ?? 1;
    if (!groups.has(step)) groups.set(step, []);
    groups.get(step).push(cell);
  }
  return [...groups.entries()].sort(([a], [b]) => a - b);
}

export function formatCellValue(cell) {
  if (cell.field_key?.startsWith("extra:") || cell.field_key?.startsWith("info:")) {
    return "✓";
  }
  return String(cell.value ?? "");
}

export function renderListingCells(container, cells) {
  if (!container) return;
  container.innerHTML = "";

  const groups = groupCellsByStep(cells);
  if (!groups.length) {
    container.innerHTML = '<p class="listings-empty">Nincs mentett cella adat.</p>';
    return;
  }

  for (const [step, stepCells] of groups) {
    const section = document.createElement("section");
    section.className = "import-cells-step";

    const title = document.createElement("h3");
    title.className = "import-cells-step-title";
    title.textContent = STEP_TITLES[step] ?? `Lépés ${step}`;
    section.appendChild(title);

    const grid = document.createElement("div");
    grid.className = "import-cells-grid";

    for (const cell of stepCells) {
      const row = document.createElement("div");
      row.className = "import-cell-row";

      const label = document.createElement("div");
      label.className = "import-cell-label";
      label.textContent = cell.label;

      const value = document.createElement("div");
      value.className = "import-cell-value";
      value.textContent = formatCellValue(cell);

      row.append(label, value);
      grid.appendChild(row);
    }

    section.appendChild(grid);
    container.appendChild(section);
  }
}
