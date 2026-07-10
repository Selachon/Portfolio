import { CONTENT } from "../content/site.js";

// Single source for the WhatsApp deep link — the primary conversion path.
// `prefill` seeds the scoping questions so the first message already qualifies the lead.
export function waHref(prefill) {
  const base = CONTENT.contact.info.whatsapp;
  return prefill ? `${base}?text=${encodeURIComponent(prefill)}` : base;
}
