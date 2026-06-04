import { Navigate } from "react-router-dom";
import { getPath } from "../../app/paths.js";

// The Atelier blog skin is a single self-contained editor, so legacy
// per-post URLs redirect back into the blog demo.
export default function DemoBlogPost({ locale }) {
  return <Navigate to={getPath("demoBlog", locale)} replace />;
}
