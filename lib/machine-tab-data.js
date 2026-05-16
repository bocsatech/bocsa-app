/** Gibt machine_tab_data unverändert zurück (work_orders bleiben erhalten). */
export function stripWorkOrdersFromTabData(tabData) {
  if (!tabData || typeof tabData !== "object" || Array.isArray(tabData)) {
    return tabData ?? {};
  }
  return tabData;
}
