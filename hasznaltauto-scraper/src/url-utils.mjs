export function shortUrl(url, max = 70) {
  const text = String(url ?? "");
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export function slugFromListUrl(url) {
  const parts = new URL(url).pathname.split("/").filter(Boolean);
  const last = parts[parts.length - 1] || "lista";
  if (last.length > 24) {
    return parts[parts.length - 2] || "talalatilista";
  }
  return last;
}
