import { useNavigate } from "react-router-dom";
import { getPath } from "./paths.js";

// Pages reference destinations by route key (e.g. "caseFares", "demos") and
// stay locale-aware through ROUTE_PATHS, matching the localized router.
export function useNav(locale) {
  const navigate = useNavigate();
  return (routeKey) => navigate(getPath(routeKey, locale));
}
