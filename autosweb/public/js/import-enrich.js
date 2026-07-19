/** Import sor kiegészítése (km, forrás URL) — böngésző és teszt is használja. */
export function enrichFormFromImportItem(formData, item) {
  const data = { ...(formData ?? {}) };
  if ((!data.km || String(data.km).trim() === "") && item?.km) {
    const digits = String(item.km).replace(/[^\d]/g, "");
    if (digits) data.km = digits;
  }
  if (item?.url && !data.forras_url) data.forras_url = item.url;
  if (item?.id && !data.hasznaltauto_hirdetes_id) data.hasznaltauto_hirdetes_id = String(item.id);
  return data;
}
