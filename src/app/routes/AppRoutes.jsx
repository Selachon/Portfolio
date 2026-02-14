import { Suspense, createElement, lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import About from "../../pages/About.jsx";
import CaseContaGo from "../../pages/CaseContaGO.jsx";
import CaseFares from "../../pages/CaseFares.jsx";
import Contact from "../../pages/Contact.jsx";
import Home from "../../pages/Home.jsx";
import Projects from "../../pages/Projects.jsx";
import { ROUTE_PATHS } from "../paths.js";

const DemoAutomation = lazy(() => import("../../pages/demos/DemoAutomation.jsx"));
const DemoBlog = lazy(() => import("../../pages/demos/DemoBlog.jsx"));
const DemoBlogPost = lazy(() => import("../../pages/demos/DemoBlogPost.jsx"));
const DemoDashboard = lazy(() => import("../../pages/demos/DemoDashboard.jsx"));
const DemoHub = lazy(() => import("../../pages/demos/DemoHub.jsx"));
const DemoLogin = lazy(() => import("../../pages/demos/DemoLogin.jsx"));

function localizedPaths(routeKey) {
  const route = ROUTE_PATHS[routeKey];
  if (!route) return [];

  return route.es === route.en ? [route.es] : [route.es, route.en];
}

const ROUTE_DEFINITIONS = [
  { paths: localizedPaths("home"), Component: Home },
  { paths: localizedPaths("projects"), Component: Projects },
  { paths: localizedPaths("about"), Component: About },
  { paths: localizedPaths("contact"), Component: Contact },
  { paths: localizedPaths("caseFares"), Component: CaseFares },
  { paths: localizedPaths("caseContaGo"), Component: CaseContaGo },
  { paths: localizedPaths("demos"), Component: DemoHub },
  { paths: localizedPaths("demoBlog"), Component: DemoBlog },
  { paths: localizedPaths("demoBlogPost"), Component: DemoBlogPost },
  { paths: localizedPaths("demoLogin"), Component: DemoLogin },
  { paths: localizedPaths("demoDashboard"), Component: DemoDashboard },
  { paths: localizedPaths("demoAutomation"), Component: DemoAutomation },
];

// Centralized route map to keep App.jsx small and simplify future route additions.
export default function AppRoutes({ locale, location }) {
  return (
    <Routes location={location}>
      {ROUTE_DEFINITIONS.flatMap(({ paths, Component: RouteComponent }) =>
        paths.map((path) => (
          <Route
            key={`${path}:${locale}`}
            path={path}
            element={<Suspense fallback={null}>{createElement(RouteComponent, { locale })}</Suspense>}
          />
        )),
      )}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
