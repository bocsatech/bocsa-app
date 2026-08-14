/** Fizetős partner ajánló kategóriák (fix lista — megegyezik a mobil PartnerCategoryCatalog-gal). */

export const PARTNER_CATEGORIES = [
  { id: "atiras_ugyintezes", label: "Átírás ügyintézés", image: "ajanlas-atiras", sort_order: 1 },
  { id: "eredetvizsga", label: "Eredetvizsga", image: "ajanlas-eredet", sort_order: 2 },
  { id: "muszakivizsga", label: "Műszaki vizsga", image: "ajanlas-muszaki", sort_order: 3 },
  { id: "autoatvizsgalas", label: "Autoátvizsgálás", image: "ajanlas-atvizsgalas", sort_order: 4 },
  { id: "autoszerelo", label: "Autószerelő", image: "ajanlas-szerelo", sort_order: 5 },
  { id: "gumiszerelo", label: "Gumiszerelő", image: "ajanlas-gumi", sort_order: 6 },
  { id: "lakatos", label: "Lakatos", image: "ajanlas-lakatos", sort_order: 7 },
  { id: "klimaszerelo", label: "Klímaszerelő", image: "ajanlas-klima", sort_order: 8 },
  { id: "autokozmetika", label: "Autókozmetika", image: "ajanlas-kozmetika", sort_order: 9 },
  { id: "autovillamossag", label: "Autóvillamosság", image: "ajanlas-villamos", sort_order: 10 },
];

export const PARTNER_CATEGORY_IDS = new Set(PARTNER_CATEGORIES.map((c) => c.id));

export function getCategoryLabel(categoryId) {
  return PARTNER_CATEGORIES.find((c) => c.id === categoryId)?.label ?? categoryId;
}

export function getCategoryImageUrl(categoryId) {
  const image =
    PARTNER_CATEGORIES.find((c) => c.id === categoryId)?.image ?? "ajanlas-szerelo";
  return `/images/ajanlas/${image}.png`;
}
