export function formatLocalizedDateTime(value, locale) {
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
