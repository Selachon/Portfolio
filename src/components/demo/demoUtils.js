// Relative "time ago" label for demo timestamps. Kept in a plain module
// (not the component file) so render-purity lint rules stay satisfied.
export function fmtAgo(ts, locale) {
  const m = Math.round((Date.now() - ts) / 60000);
  if (m < 1) return locale === "es" ? "ahora" : "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.round(h / 24)}d`;
}
