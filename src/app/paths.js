// Demo routes are grouped under /demos and share transitions/navigation behavior.
export function isDemoPath(pathname) {
  return pathname.startsWith("/demos");
}
