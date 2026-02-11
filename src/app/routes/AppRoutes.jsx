import { createElement } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import About from "../../pages/About.jsx";
import CaseFares from "../../pages/CaseFares.jsx";
import Contact from "../../pages/Contact.jsx";
import Home from "../../pages/Home.jsx";
import Projects from "../../pages/Projects.jsx";
import DemoAutomation from "../../pages/demos/DemoAutomation.jsx";
import DemoBlog from "../../pages/demos/DemoBlog.jsx";
import DemoBlogPost from "../../pages/demos/DemoBlogPost.jsx";
import DemoDashboard from "../../pages/demos/DemoDashboard.jsx";
import DemoHub from "../../pages/demos/DemoHub.jsx";
import DemoLogin from "../../pages/demos/DemoLogin.jsx";

const ROUTE_DEFINITIONS = [
  { path: "/", Component: Home },
  { path: "/proyectos", Component: Projects },
  { path: "/projects", Component: Projects },
  { path: "/sobre-mi", Component: About },
  { path: "/about", Component: About },
  { path: "/contacto", Component: Contact },
  { path: "/contact", Component: Contact },
  { path: "/caso/fares", Component: CaseFares },
  { path: "/case/fares", Component: CaseFares },
  { path: "/demos", Component: DemoHub },
  { path: "/demos/blog", Component: DemoBlog },
  { path: "/demos/blog/:slug", Component: DemoBlogPost },
  { path: "/demos/login", Component: DemoLogin },
  { path: "/demos/dashboard", Component: DemoDashboard },
  { path: "/demos/automation", Component: DemoAutomation },
];

// Centralized route map to keep App.jsx small and simplify future route additions.
export default function AppRoutes({ locale, location }) {
  return (
    <Routes location={location}>
      {ROUTE_DEFINITIONS.map(({ path, Component: RouteComponent }) => (
        <Route key={path} path={path} element={createElement(RouteComponent, { locale })} />
      ))}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
