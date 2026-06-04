/* ────────────────────────────────────────────────────────────
   CONTENT — all copy (ES/EN) + project data
   Ported from the Kora "Operations Console" design bundle.
   `routeKey` values map to ROUTE_PATHS so navigation stays
   locale-aware in this react-router app.
   ──────────────────────────────────────────────────────────── */

export const CONTENT = {
  nav: {
    es: { projects: "Proyectos", about: "Sobre mí", contact: "Contacto", demos: "Demos" },
    en: { projects: "Projects", about: "About", contact: "Contact", demos: "Demos" },
  },

  // ──────────────────────────────────────────────
  home: {
    es: {
      eyebrow: "OPERACIONES // KORA",
      titleLine1: "Construyo soluciones web",
      titleItalic: "para negocio",
      titleLine2: ".",
      sub: "Desarrollo sitios web, web apps y automatizaciones con foco en rendimiento, mantenibilidad y claridad operativa. Kora by Sela es mi marca personal de trabajo.",
      ctaPrimary: "Caso · FARES",
      ctaSecondary: "Ver demos",
      statusLabel: "Estado del sistema",
      statusFooter: "Actualizado en tiempo real",
      sectionWork: "// 02 — ENFOQUE",
      stats: [
        { k: "Servicios", v: "Web · Apps · Auto" },
        { k: "Modelo", v: "Build + Soporte" },
        { k: "Stack base", v: "Node · React · IA" },
        { k: "Cobertura", v: "LATAM · INT" },
      ],
      feats: [
        {
          idx: "01",
          tag: "MÉTODO",
          t: "Negocio primero",
          b: "Primero entiendo objetivo y contexto. Después diseño una solución simple, sólida y escalable por módulos para no comprometer el futuro del proyecto.",
        },
        {
          idx: "02",
          tag: "STACK",
          t: "Herramientas por resultado",
          b: "Node.js como base para backend y automatizaciones. React + Vite para frontend cuando se necesita experiencia cuidada. Elijo herramientas por outcome, no por moda.",
        },
        {
          idx: "03",
          tag: "IA",
          t: "Aceleración con criterio",
          b: "Uso IA para acelerar investigación, implementación y validación. Las decisiones de arquitectura, QA y estabilidad final pasan por mí.",
        },
      ],
      ticker: [
        { t: "uptime:fares", v: "operational", k: "ok" },
        { t: "deploy:contago", v: "in_progress", k: "warn" },
        { t: "ticket:close", v: "+04 today", k: "ok" },
        { t: "auto:cron_07", v: "executed", k: "ok" },
        { t: "branch:main", v: "ahead 2 commits", k: "warn" },
        { t: "uptime:kora", v: "99.98% / 30d", k: "ok" },
        { t: "ai:assist", v: "human_owned", k: "ok" },
        { t: "stack:react", v: "v19.2", k: "warn" },
        { t: "lint:passing", v: "0 errors", k: "ok" },
        { t: "build:vite", v: "1.2s", k: "ok" },
      ],
      footnoteHero: "// brand: KORA · operator: SELA · version: 2026.05",
    },
    en: {
      eyebrow: "OPERATIONS // KORA",
      titleLine1: "I build business-ready",
      titleItalic: "web solutions",
      titleLine2: ".",
      sub: "I develop websites, web apps, and automations focused on performance, maintainability, and operational clarity. Kora by Sela is my personal service brand.",
      ctaPrimary: "Case · FARES",
      ctaSecondary: "View demos",
      statusLabel: "System status",
      statusFooter: "Updated in realtime",
      sectionWork: "// 02 — APPROACH",
      stats: [
        { k: "Services", v: "Web · Apps · Auto" },
        { k: "Model", v: "Build + Support" },
        { k: "Core stack", v: "Node · React · AI" },
        { k: "Coverage", v: "LATAM · INT" },
      ],
      feats: [
        {
          idx: "01",
          tag: "METHOD",
          t: "Business first",
          b: "I start by understanding goal and context. Then design a simple, solid, modular solution that scales without compromising the project's future.",
        },
        {
          idx: "02",
          tag: "STACK",
          t: "Tools by outcome",
          b: "Node.js as foundation for backend and automation. React + Vite for frontend when UX matters. I pick tools by outcome, not by hype.",
        },
        {
          idx: "03",
          tag: "AI",
          t: "Acceleration with accountability",
          b: "I use AI to speed up research, implementation and validation. Architecture decisions, QA and production-grade quality stay fully owned by me.",
        },
      ],
      ticker: [
        { t: "uptime:fares", v: "operational", k: "ok" },
        { t: "deploy:contago", v: "in_progress", k: "warn" },
        { t: "ticket:close", v: "+04 today", k: "ok" },
        { t: "auto:cron_07", v: "executed", k: "ok" },
        { t: "branch:main", v: "ahead 2 commits", k: "warn" },
        { t: "uptime:kora", v: "99.98% / 30d", k: "ok" },
        { t: "ai:assist", v: "human_owned", k: "ok" },
        { t: "stack:react", v: "v19.2", k: "warn" },
        { t: "lint:passing", v: "0 errors", k: "ok" },
        { t: "build:vite", v: "1.2s", k: "ok" },
      ],
      footnoteHero: "// brand: KORA · operator: SELA · version: 2026.05",
    },
  },

  // ──────────────────────────────────────────────
  projects: {
    es: {
      eyebrow: "// 01 — PROYECTOS",
      title: "Producción y laboratorio.",
      sub: "Casos reales y experimentos técnicos. En Kora priorizo calidad operativa y contexto de negocio, no volumen sin sentido.",
      featuredLabel: "DESTACADOS",
      labLabel: "LABORATORIO",
      labText: "Proyectos para experimentar, validar ideas y mejorar procesos. No son marketing: práctica real aplicada a desarrollo y automatización.",
    },
    en: {
      eyebrow: "// 01 — PROJECTS",
      title: "Production & lab.",
      sub: "Real cases plus technical experiments. At Kora I prioritize operational quality and business context over empty volume.",
      featuredLabel: "FEATURED",
      labLabel: "LAB",
      labText: "Projects used to experiment, validate ideas and improve workflows. Not portfolio fillers — real technical practice in development and automation.",
    },
  },

  // PROJECT ITEMS
  items: [
    {
      slug: "fares",
      featured: true,
      live: "https://faresbcs.com/",
      title: { es: "FARES — Plataforma web en producción", en: "FARES — Production web platform" },
      desc: {
        es: "Desarrollo y mantenimiento de una plataforma para gestión de inspecciones técnicas. Foco en estabilidad y evolución continua.",
        en: "Development and maintenance of a platform for technical inspection management. Focus on stability and continuous evolution.",
      },
      tags: ["Node.js", "React (Vite)", "Producción", "Mantenimiento"],
      routeKey: "caseFares",
    },
    {
      slug: "contago",
      featured: true,
      live: "https://contago.com.co/",
      title: { es: "ContaGO — Sitio web corporativo", en: "ContaGO — Corporate website" },
      desc: {
        es: "Proyecto activo para una firma contable: arquitectura del sitio, páginas de servicios y enfoque en claridad comercial.",
        en: "Active project for an accounting firm: website architecture, service pages, and clear commercial messaging.",
      },
      tags: ["Frontend", "SEO base", "En progreso"],
      routeKey: "caseContaGo",
    },
    {
      slug: "discord-bots",
      featured: false,
      title: { es: "Bots de Discord — Node.js", en: "Discord bots — Node.js" },
      desc: {
        es: "Laboratorio personal con eventos, comandos, APIs, permisos y automatizaciones. Práctica real de asincronía y manejo de estados.",
        en: "Personal lab for events, commands, APIs, permissions and automations. Real practice in async flows and state handling.",
      },
      tags: ["Node.js", "Eventos", "APIs", "Automatización"],
      routeKey: null,
    },
    {
      slug: "automation-scripts",
      featured: false,
      title: { es: "Automatizaciones — scripts y utilidades", en: "Automations — scripts and utilities" },
      desc: {
        es: "Herramientas pequeñas para resolver tareas repetitivas: validaciones, formatos, integraciones y utilidades de flujo diario.",
        en: "Small tools to solve repetitive tasks: validations, formatting, integrations and day-to-day workflow helpers.",
      },
      tags: ["Node.js", "Scripting", "Productividad"],
      routeKey: null,
    },
  ],

  // ──────────────────────────────────────────────
  about: {
    es: {
      eyebrow: "// 03 — SOBRE",
      title: "Jose, alias Sela.",
      sub: "Quién soy, qué representa Sela y cómo trabajo Kora como servicio web.",
      photoLabel: ["FOTO", "EN", "ACTUALIZACIÓN"],
      p1: "Soy Jose. Sela no es solo un apodo: es mi marca personal y mi firma de trabajo, la forma en la que estructuro y ejecuto proyectos de principio a fin.",
      p2: "Kora es el servicio con el que ayudo a negocios y equipos a construir sitios web, landing pages, web apps y automatizaciones con foco en resultados reales.",
      p3: "Mi base viene del soporte técnico y de operar sistemas en producción: incidentes reales, mantenimiento continuo y decisiones con impacto. Por eso priorizo claridad, rendimiento y mantenibilidad desde el día uno.",
      originBtn: "Ver origen de Kora",
      originTitle: "Origen de Kora",
      originParas: [
        "El nombre Kora nace de core: el núcleo digital que sostiene un negocio. Mi enfoque es construir primero ese núcleo con orden y luego escalarlo sin perder claridad.",
        "También nace de ora, del ahora. Porque las ideas no viven en espera. Con el uso estratégico de IA se obtienen resultados de alta calidad en tiempos oportunos.",
        "Y, al final, también hay algo de (Kora)zón. Porque detrás de cada sistema, cada automatización y cada estructura, hay intención.",
        "Kora es núcleo, es presente y es propósito. Estructura con dirección. Tecnología con sentido.",
      ],
      workTitle: "Cómo trabajo",
      bullets: [
        "Alineo primero el objetivo del negocio y luego la solución técnica.",
        "Priorizo claridad, rendimiento y mantenibilidad en producción.",
        "Uso IA para acelerar el proceso, no para delegar la responsabilidad.",
        "Trabajo por iteraciones cortas para entregar valor desde temprano.",
      ],
      ctaTitle: "¿Tu proyecto necesita una base sólida?",
      ctaText: "Hablemos y te propongo una ruta técnica clara para construirlo o mejorarlo.",
      ctaBtn: "Contactar",
    },
    en: {
      eyebrow: "// 03 — ABOUT",
      title: "Jose, aka Sela.",
      sub: "Who I am, what Sela represents and how I run Kora as a web service.",
      photoLabel: ["PHOTO", "BEING", "UPDATED"],
      p1: "I am Jose. Sela is not just a nickname; it is my personal brand and professional signature, the way I structure and execute projects end to end.",
      p2: "Kora is the service through which I help teams and businesses build websites, landing pages, web apps and automations focused on real outcomes.",
      p3: "My foundation comes from technical support and production operations: real incidents, ongoing maintenance and high-impact decisions. That is why I prioritize clarity, performance and maintainability from day one.",
      originBtn: "See Kora origin",
      originTitle: "Kora origin",
      originParas: [
        "The name Kora comes from core: the digital nucleus that sustains a business. My approach is to build that nucleus first, with structure and clarity, then scale it without losing direction.",
        "It also echoes ora, the now. Because ideas should not wait. Through the strategic use of AI, high-quality results are delivered at the right time.",
        "And finally, there is a subtle reference to heart. Because behind every system, every automation, and every structure, there is intention.",
        "Kora stands for core, now and heart. Structure with direction. Technology with purpose.",
      ],
      workTitle: "How I work",
      bullets: [
        "I align business goals first, then shape the technical solution.",
        "I prioritize clarity, performance and maintainability in production.",
        "I use AI to accelerate execution, not to outsource accountability.",
        "I work in short iterations to deliver value early.",
      ],
      ctaTitle: "Need a solid technical foundation?",
      ctaText: "Let's talk. I can map a clear technical path to build or improve your project.",
      ctaBtn: "Contact",
    },
  },

  // ──────────────────────────────────────────────
  contact: {
    info: {
      email: "info@korabysela.dev",
      linkedin: "https://www.linkedin.com/in/josep99/",
      whatsapp: "https://wa.me/573505550445",
      whatsappDisplay: "+57 350 555 0445",
    },
    es: {
      eyebrow: "// 04 — CONTACTO",
      title: "Abrir canal.",
      sub: "Cuéntame qué necesitas y te respondo con una propuesta clara.",
      labels: {
        email: "CORREO",
        response: "TIEMPO DE RESPUESTA",
        scope: "COBERTURA",
        linkedin: "LINKEDIN",
        whatsapp: "WHATSAPP",
        availability: "DISPONIBILIDAD",
      },
      values: {
        response: "Normalmente <24h",
        scope: "Remoto · Colombia · LATAM · INT",
        availability: "Aceptando proyectos · Q3 2026",
      },
      cta: "Escribir por correo",
      ctaWa: "WhatsApp directo",
      whatsappPrefill: "Hola Jose, vi tu portafolio en Kora by Sela y me gustaría hablar sobre un proyecto web.",
    },
    en: {
      eyebrow: "// 04 — CONTACT",
      title: "Open channel.",
      sub: "Tell me what you need and I'll reply with a clear proposal.",
      labels: {
        email: "EMAIL",
        response: "RESPONSE TIME",
        scope: "COVERAGE",
        linkedin: "LINKEDIN",
        whatsapp: "WHATSAPP",
        availability: "AVAILABILITY",
      },
      values: {
        response: "Usually <24h",
        scope: "Remote · Colombia · LATAM · INT",
        availability: "Accepting projects · Q3 2026",
      },
      cta: "Send email",
      ctaWa: "Direct WhatsApp",
      whatsappPrefill: "Hi Jose, I found your Kora by Sela portfolio and would like to discuss a web project.",
    },
  },

  // ──────────────────────────────────────────────
  // CASE STUDIES — keyed by slug
  cases: {
    fares: {
      es: {
        eyebrow: "// CASO — FARES",
        title: "De web informativa a plataforma operativa.",
        sub: "Diseño, implementación en producción y mejora continua para una empresa de inspecciones técnicas.",
        tags: ["Producción", "Node.js", "React (Vite)", "Mantenimiento", "Soporte"],
        meta: [
          { k: "ROL", v: "Full-stack + soporte" },
          { k: "STACK", v: "React · Node.js · Vite" },
          { k: "ESTADO", v: "Operativo" },
          { k: "MODELO", v: "Build + Continuous" },
        ],
        summary: "FARES necesitaba pasar de una presencia web básica a una plataforma para gestionar operación diaria. Construí la solución de punta a punta (frontend + backend), la desplegué en producción y continúo con mantenimiento evolutivo.",
        sections: [
          { idx: "01", t: "Contexto y objetivo", body: "La empresa ya tenía una página en WordPress orientada a información. El reto fue construir una aplicación web para procesos reales del equipo, con base técnica estable y preparada para crecer.", bullets: ["Pasar de una web informativa a una plataforma operativa.", "Diseñar flujos claros para uso diario en producción.", "Dejar una base modular para evolución sin rehacer todo."] },
          { idx: "02", t: "Mi rol", body: "Participé en todo el ciclo del proyecto: arquitectura, desarrollo, despliegue y soporte continuo. El alcance evolucionó con feedback del equipo en uso real.", bullets: ["Frontend en React (Vite), con foco en claridad de uso.", "Backend en Node.js con lógica de negocio e integraciones.", "Soporte en producción: ajustes, correcciones y mejoras.", "Iteración continua sin romper funcionalidades activas."] },
          { idx: "03", t: "Qué se construyó", body: "Sin exponer detalles sensibles del negocio, la plataforma se diseñó para centralizar trabajo operativo y mejorar trazabilidad interna.", bullets: ["Módulos para gestión y seguimiento de tareas clave.", "Roles y permisos para controlar acceso por perfil.", "Flujos de creación, revisión y actualización de registros.", "Base preparada para añadir nuevas funciones por etapas."] },
          { idx: "04", t: "Decisiones técnicas", body: "El stack se eligió por velocidad de ejecución, mantenibilidad y estabilidad operativa. La prioridad fue construir algo sostenible, no complejo por apariencia.", bullets: ["React + Vite para un frontend rápido y modular.", "Node.js para backend y continuidad en iteraciones.", "Estructura clara, validaciones y manejo de errores.", "IA como acelerador, con control humano en decisiones y QA."] },
          { idx: "05", t: "Resultados", body: "El cambio principal fue operativo: pasar de tener una web a usar una herramienta de trabajo real todos los días.", bullets: ["Operación más centralizada y con mejor visibilidad.", "Menos fricción manual en procesos internos.", "Base técnica lista para nuevas mejoras sin retrabajo fuerte."] },
          { idx: "06", t: "Mantenimiento", body: "Este no fue un proyecto de entrega única. Sigue activo con mejoras iterativas, soporte y ajustes según uso real del equipo.", bullets: ["Correcciones y mejoras a partir de feedback real.", "Evolución por módulos para mantener estabilidad.", "Acompañamiento técnico continuo en producción."] },
        ],
      },
      en: {
        eyebrow: "// CASE — FARES",
        title: "From informational site to operational platform.",
        sub: "Architecture, production delivery and continuous improvement for a technical inspection company.",
        tags: ["Production", "Node.js", "React (Vite)", "Maintenance", "Support"],
        meta: [
          { k: "ROLE", v: "Full-stack + support" },
          { k: "STACK", v: "React · Node.js · Vite" },
          { k: "STATE", v: "Operational" },
          { k: "MODEL", v: "Build + Continuous" },
        ],
        summary: "FARES needed to move from a basic web presence to a platform used for day-to-day operations. I built the solution end to end (frontend + backend), deployed it to production and continue with ongoing maintenance.",
        sections: [
          { idx: "01", t: "Context & goal", body: "The company already had a WordPress site focused on information. The challenge was to build a web app for real team workflows, with a stable technical foundation and room to scale.", bullets: ["Move from informational site to operational platform.", "Design clear workflows for daily production use.", "Leave a modular foundation for future growth."] },
          { idx: "02", t: "My role", body: "I worked across the full lifecycle: architecture, development, deployment and continuous support. Scope evolved through real usage feedback.", bullets: ["React (Vite) frontend focused on usability clarity.", "Node.js backend with business logic and integrations.", "Production support: fixes, adjustments, improvements.", "Continuous iteration without breaking active features."] },
          { idx: "03", t: "What was built", body: "Without exposing sensitive business details, the platform was designed to centralize operational work and improve internal traceability.", bullets: ["Core modules for operational management and tracking.", "Role and permission system by user profile.", "Create, review and update workflows for records.", "Foundation ready for incremental features."] },
          { idx: "04", t: "Technical decisions", body: "The stack was selected for delivery speed, maintainability and production stability. The goal was a sustainable product, not complexity for show.", bullets: ["React + Vite for a fast, modular frontend.", "Node.js backend for consistent iteration speed.", "Clear structure, validation and error handling.", "AI used as an accelerator with human ownership of QA and architecture."] },
          { idx: "05", t: "Outcomes", body: "The key result was operational: moving from just having a website to using an internal work tool daily.", bullets: ["More centralized operations and better visibility.", "Less manual friction in internal workflows.", "A technical base that supports new features without major rework."] },
          { idx: "06", t: "Maintenance", body: "This was not a one-time delivery. The platform remains active with iterative improvements, support and updates based on real team usage.", bullets: ["Fixes and improvements driven by real feedback.", "Module-based evolution to protect stability.", "Ongoing technical ownership in production."] },
        ],
      },
    },
    contago: {
      es: {
        eyebrow: "// CASO — CONTAGO",
        title: "Sitio corporativo para firma contable.",
        sub: "Arquitectura web, páginas de servicios y claridad comercial. Proyecto activo.",
        tags: ["Frontend", "Contenido", "SEO base", "En progreso"],
        meta: [
          { k: "ROL", v: "Frontend + arquitectura" },
          { k: "ESTADO", v: "En progreso" },
          { k: "ENFOQUE", v: "Comercial / SEO" },
          { k: "ENTREGABLE", v: "Sitio público" },
        ],
        summary: "Proyecto activo para una firma contable. Construyo la arquitectura del sitio, las páginas de servicios y la estructura comercial pensada para conversión y claridad de propuesta.",
        sections: [
          { idx: "01", t: "Contexto", body: "ContaGO necesitaba un sitio corporativo que comunicara su propuesta con claridad y diera entrada estructurada a sus servicios. El alcance es web pública con foco comercial.", bullets: ["Identidad de servicios contables.", "Necesidad de claridad para clientes corporativos.", "Base preparada para añadir contenido y SEO."] },
          { idx: "02", t: "Mi rol", body: "Trabajo el frontend, la arquitectura del sitio y las páginas de servicios. Diseño la propuesta visual con dirección comercial y técnica.", bullets: ["Arquitectura de información del sitio.", "Estructura de páginas de servicios.", "Estilo gráfico coherente con la marca."] },
          { idx: "03", t: "Decisiones", body: "Sitio estático rápido, ligero, indexable, con estructura clara para crecer en contenido sin romper rendimiento.", bullets: ["Renderizado rápido y baja fricción.", "Estructura SEO básica y limpia.", "Componentes reutilizables para nuevas secciones."] },
          { idx: "04", t: "Próximos pasos", body: "El proyecto sigue activo. Las siguientes iteraciones priorizan contenido comercial, casos y formularios de captura.", bullets: ["Publicación inicial del sitio.", "Iteración de contenido por servicio.", "Métricas y mejoras de conversión."] },
        ],
      },
      en: {
        eyebrow: "// CASE — CONTAGO",
        title: "Corporate site for an accounting firm.",
        sub: "Web architecture, services pages and commercial clarity. Active project.",
        tags: ["Frontend", "Content", "Basic SEO", "In progress"],
        meta: [
          { k: "ROLE", v: "Frontend + architecture" },
          { k: "STATE", v: "In progress" },
          { k: "FOCUS", v: "Commercial / SEO" },
          { k: "DELIVERABLE", v: "Public website" },
        ],
        summary: "Active project for an accounting firm. I build the website architecture, the service pages and the commercial structure designed for conversion and proposition clarity.",
        sections: [
          { idx: "01", t: "Context", body: "ContaGO needed a corporate site that communicates its proposition clearly and structures entry to its services. Scope is public website with commercial focus.", bullets: ["Accounting services identity.", "Need for clarity for corporate clients.", "Foundation ready for content and SEO."] },
          { idx: "02", t: "My role", body: "I work on the frontend, the site architecture and the service pages. I design the visual proposal with commercial and technical direction.", bullets: ["Information architecture for the site.", "Structure of service pages.", "Graphic style coherent with the brand."] },
          { idx: "03", t: "Decisions", body: "Fast, light, indexable static site with clear structure to grow in content without breaking performance.", bullets: ["Fast rendering, low friction.", "Clean basic SEO structure.", "Reusable components for new sections."] },
          { idx: "04", t: "Next steps", body: "The project is still active. Next iterations prioritize commercial content, cases and capture forms.", bullets: ["Initial publication of the site.", "Iteration of content per service.", "Metrics and conversion improvements."] },
        ],
      },
    },
  },

  // ──────────────────────────────────────────────
  demos: {
    es: {
      eyebrow: "// 05 — DEMOS",
      title: "Laboratorio interactivo.",
      sub: "Flujos tipo producto para mostrar criterio de UX, arquitectura y manejo de estado. Datos locales para simulación.",
    },
    en: {
      eyebrow: "// 05 — DEMOS",
      title: "Interactive lab.",
      sub: "Product-like flows to show UX judgment, architecture and state handling. Local data for simulation.",
    },
    items: [
      {
        id: "blog",
        routeKey: "demoBlog",
        accent: "#B0543A",
        title: { es: "Blog CMS", en: "Blog CMS" },
        desc: {
          es: "Flujo CRUD local: crear, editar, publicar y archivar artículos. Estado persistente en cliente.",
          en: "Local CRUD flow: create, edit, publish and archive articles. Persistent client state.",
        },
        status: "LIVE",
      },
      {
        id: "auth",
        routeKey: "demoLogin",
        accent: "#5B4BE8",
        title: { es: "Auth por roles", en: "Role-based auth" },
        desc: {
          es: "Login con dos perfiles (admin / user). Acceso condicionado a vistas y acciones según rol.",
          en: "Login with two profiles (admin / user). View and action access scoped by role.",
        },
        status: "LIVE",
      },
      {
        id: "automation",
        routeKey: "demoAutomation",
        accent: "#1FB877",
        title: { es: "Automatización", en: "Automation" },
        desc: {
          es: "Trigger → acciones → logs. Simulación de un panel de operaciones con eventos en tiempo real.",
          en: "Trigger → actions → logs. Operations panel simulation with realtime events.",
        },
        status: "LIVE",
      },
      {
        id: "dashboard",
        routeKey: "demoDashboard",
        accent: "#22D3EE",
        title: { es: "Dashboard operativo", en: "Operations dashboard" },
        desc: {
          es: "Vista de métricas y eventos. KPIs, series temporales y filtros. Datos locales.",
          en: "Metrics and events view. KPIs, time series and filters. Local data.",
        },
        status: "LIVE",
      },
    ],
  },

  // demo credentials note
  demoCreds: {
    es: "Credenciales demo · admin@korabysela.dev / kora-admin-2026  ·  user@korabysela.dev / kora-user-2026",
    en: "Demo credentials · admin@korabysela.dev / kora-admin-2026  ·  user@korabysela.dev / kora-user-2026",
  },

  footer: {
    es: { line: "Kora by Sela · construido por Jose · 2026", op: "STATUS · OPERATIONAL" },
    en: { line: "Kora by Sela · built by Jose · 2026", op: "STATUS · OPERATIONAL" },
  },
};

export default CONTENT;
