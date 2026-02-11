const projects = [
  {
    slug: "fares",
    featured: true,
    title: {
      es: "FARES | Plataforma web en producción",
      en: "FARES | Production web platform",
    },
    description: {
      es: "Desarrollo y mantenimiento de una plataforma web para gestión de inspecciones técnicas, con foco en estabilidad y evolución continua.",
      en: "Development and maintenance of a web platform for technical inspection management, focused on stability and continuous evolution.",
    },
    tags: {
      es: ["Node.js", "React (Vite)", "Producción", "Mantenimiento", "Operación"],
      en: ["Node.js", "React (Vite)", "Production", "Maintenance", "Operations"],
    },
    links: {
      es: [{ label: "Caso de estudio", href: "/caso/fares", external: false }],
      en: [{ label: "Case study", href: "/case/fares", external: false }],
    },
  },
  {
    slug: "contago",
    featured: true,
    title: {
      es: "ContaGO | Sitio web corporativo",
      en: "ContaGO | Corporate website",
    },
    description: {
      es: "Proyecto activo para una firma contable: arquitectura del sitio, páginas de servicios y enfoque en claridad comercial.",
      en: "Active project for an accounting firm: website architecture, service pages, and a clear commercial message.",
    },
    tags: {
      es: ["Frontend", "Contenido comercial", "SEO base", "En progreso"],
      en: ["Frontend", "Commercial content", "Basic SEO", "In progress"],
    },
    links: {
      es: [{ label: "Consultar disponibilidad", href: "/contacto", external: false }],
      en: [{ label: "Check availability", href: "/contact", external: false }],
    },
  },
  {
    slug: "discord-bots",
    featured: false,
    title: {
      es: "Bots de Discord | Node.js",
      en: "Discord bots | Node.js",
    },
    description: {
      es: "Laboratorio personal con eventos, comandos, APIs, permisos y automatizaciones. Práctica real de asincronía y manejo de estados.",
      en: "Personal lab for events, commands, APIs, permissions, and automations. Real practice in async flows and state handling.",
    },
    tags: {
      es: ["Node.js", "Eventos", "APIs", "Automatización"],
      en: ["Node.js", "Events", "APIs", "Automation"],
    },
    links: {
      es: [{ label: "Contacto", href: "/contacto", external: false }],
      en: [{ label: "Contact", href: "/contact", external: false }],
    },
  },
  {
    slug: "automation-scripts",
    featured: false,
    title: {
      es: "Automatizaciones | Scripts y utilidades",
      en: "Automations | Scripts and utilities",
    },
    description: {
      es: "Herramientas pequeñas para resolver tareas repetitivas: validaciones, formatos, integraciones y utilidades de flujo diario.",
      en: "Small tools to solve repetitive tasks: validations, formatting, integrations, and day-to-day workflow helpers.",
    },
    tags: {
      es: ["Node.js", "Scripting", "Productividad"],
      en: ["Node.js", "Scripting", "Productivity"],
    },
    links: {
      es: [{ label: "Contacto", href: "/contacto", external: false }],
      en: [{ label: "Contact", href: "/contact", external: false }],
    },
  },
];

export function getLocalizedProjects(locale = "es") {
  return projects.map((project) => {
    const safeLocale = locale === "en" ? "en" : "es";

    return {
      slug: project.slug,
      featured: project.featured,
      title: project.title[safeLocale] ?? project.title.es,
      description: project.description[safeLocale] ?? project.description.es,
      tags: project.tags[safeLocale] ?? project.tags.es,
      links: project.links[safeLocale] ?? project.links.es,
    };
  });
}

export default projects;
