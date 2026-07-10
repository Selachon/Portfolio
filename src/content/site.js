/* ────────────────────────────────────────────────────────────
   CONTENT — all copy (ES/EN) + project data
   Ported from the Kora "Operations Console" design bundle.
   `routeKey` values map to ROUTE_PATHS so navigation stays
   locale-aware in this react-router app.
   Spanish copy uses neutral tuteo (no voseo, no regionalisms).
   ──────────────────────────────────────────────────────────── */

export const CONTENT = {
  nav: {
    es: { projects: "Casos", about: "Sobre mí", contact: "Contacto", demos: "Demos" },
    en: { projects: "Cases", about: "About", contact: "Contact", demos: "Demos" },
  },

  // ──────────────────────────────────────────────
  home: {
    es: {
      eyebrow: "OPERACIONES // KORA",
      titleLine1: "Tu sistema interno,",
      titleItalic: "funcionando en semanas",
      titleLine2: ".",
      sub: "Construyo dashboards, backends y automatizaciones a medida para empresas que hoy operan en Excel, en papel o con software que no les sirve. Apalancado en IA, entrego en semanas lo que un equipo tradicional cotiza en meses.",
      ctaPrimary: "Cotizar mi sistema",
      ctaSecondary: "Ver casos reales",
      statusLabel: "Consola Kora",
      statusFooter: "Muestra ilustrativa · no es telemetría real",
      statusBadge: "STREAM · DEMO",
      sectionWork: "// 02 — SERVICIOS",
      stats: [
        { k: "Entrega típica", v: "2–4 semanas" },
        { k: "Desde", v: "$500 USD" },
        { k: "Modelo", v: "Precio cerrado" },
        { k: "Cobertura", v: "Remoto · LATAM" },
      ],
      servicesEyebrow: "// 02 — SERVICIOS",
      servicesTitle: "Dos formas de trabajar conmigo.",
      services: [
        {
          idx: "01",
          tag: "SISTEMAS A MEDIDA",
          t: "El sistema interno que tu equipo necesita",
          b: "Dashboards, backends, paneles de gestión y automatizaciones construidos alrededor de tu proceso real, no de una plantilla. Autenticación por roles, reportes y las integraciones que ya usas.",
          bullets: [
            "Automatización o integración puntual — desde $500 USD",
            "Sistema completo: dashboard + backend + auth — desde $1.500 USD",
            "Entrega típica: 2 a 4 semanas, no 6 meses",
          ],
        },
        {
          idx: "02",
          tag: "INFRA + IA PRIVADA",
          t: "Servidores e IA que corren en tu empresa",
          b: "Infraestructura propia, dominio Windows, servidores y modelos de IA locales. Tus datos no salen de tu red y no pagas por usuario al mes. No es teoría: opero mi propio servidor con Proxmox y modelos locales.",
          bullets: [
            "Self-hosting y virtualización (Proxmox, Linux, Windows Server)",
            "IA local con Ollama — sin enviar datos a terceros",
            "Dominio, usuarios y políticas centralizadas (Active Directory)",
          ],
        },
      ],
      whyEyebrow: "// 03 — POR QUÉ RÁPIDO",
      whyTitle: "La velocidad no es un atajo.",
      feats: [
        {
          idx: "01",
          tag: "MÉTODO",
          t: "Negocio primero",
          b: "Primero entiendo el proceso y el objetivo. Después diseño la solución más simple que lo resuelve. Casi nunca es la más grande.",
        },
        {
          idx: "02",
          tag: "IA",
          t: "3–5x más rápido, mismo estándar",
          b: "Uso Claude Code y herramientas de IA para investigar, implementar y validar. Eso comprime el calendario, no la calidad: arquitectura, QA y estabilidad las decido y las respondo yo.",
        },
        {
          idx: "03",
          tag: "OPERACIÓN",
          t: "Vengo de sostener producción",
          b: "Mi base es soporte técnico e infraestructura en producción: incidentes reales, mantenimiento y decisiones con impacto. Construyo pensando en el día 200, no en la demo.",
        },
      ],
      ticker: [
        { t: "svc:sistemas_internos", v: "disponible", k: "ok" },
        { t: "svc:infra_ia_privada", v: "disponible", k: "ok" },
        { t: "entrega:objetivo", v: "2-4 semanas", k: "ok" },
        { t: "modelo:precio", v: "cerrado", k: "ok" },
        { t: "stack:node_react", v: "producción", k: "ok" },
        { t: "infra:proxmox", v: "self-hosted", k: "ok" },
        { t: "ia:ollama", v: "local_only", k: "ok" },
        { t: "auth:ldaps", v: "integrado", k: "ok" },
        { t: "ai:assist", v: "human_owned", k: "ok" },
        { t: "agenda:q3_2026", v: "cupos abiertos", k: "warn" },
      ],
      footnoteHero: "// brand: KORA · operator: SELA · version: 2026.07",
      proofEyebrow: "// 04 — PRUEBA",
      closingTitle: "¿Tu equipo sigue peleando con Excel?",
      closingText: "Cuéntame qué proceso te está costando tiempo. Te digo si se puede resolver, cuánto cuesta y en cuánto lo tienes — sin compromiso.",
      closingCta: "Escríbeme por WhatsApp",
    },
    en: {
      eyebrow: "OPERATIONS // KORA",
      titleLine1: "Your internal system,",
      titleItalic: "running in weeks",
      titleLine2: ".",
      sub: "I build custom dashboards, backends and automations for companies still running on spreadsheets, paper, or software that doesn't fit. Leveraging AI, I ship in weeks what a traditional team quotes in months.",
      ctaPrimary: "Get a quote",
      ctaSecondary: "See real cases",
      statusLabel: "Kora console",
      statusFooter: "Illustrative sample · not real telemetry",
      statusBadge: "STREAM · DEMO",
      sectionWork: "// 02 — SERVICES",
      stats: [
        { k: "Typical delivery", v: "2–4 weeks" },
        { k: "Starting at", v: "$500 USD" },
        { k: "Model", v: "Fixed price" },
        { k: "Coverage", v: "Remote · LATAM" },
      ],
      servicesEyebrow: "// 02 — SERVICES",
      servicesTitle: "Two ways to work with me.",
      services: [
        {
          idx: "01",
          tag: "CUSTOM SYSTEMS",
          t: "The internal system your team actually needs",
          b: "Dashboards, backends, admin panels and automations built around your real process, not a template. Role-based auth, reporting, and the integrations you already depend on.",
          bullets: [
            "One-off automation or integration — from $500 USD",
            "Full system: dashboard + backend + auth — from $1,500 USD",
            "Typical delivery: 2 to 4 weeks, not 6 months",
          ],
        },
        {
          idx: "02",
          tag: "INFRA + PRIVATE AI",
          t: "Servers and AI that run inside your company",
          b: "Your own infrastructure, Windows domain, servers and local AI models. Your data never leaves your network and you stop paying per seat, per month. Not theory: I run my own Proxmox server with local models.",
          bullets: [
            "Self-hosting and virtualization (Proxmox, Linux, Windows Server)",
            "Local AI with Ollama — no data sent to third parties",
            "Centralized domain, users and policies (Active Directory)",
          ],
        },
      ],
      whyEyebrow: "// 03 — WHY FAST WORKS",
      whyTitle: "Speed is not a shortcut.",
      feats: [
        {
          idx: "01",
          tag: "METHOD",
          t: "Business first",
          b: "I start with the process and the goal. Then I design the simplest solution that solves it. It's rarely the biggest one.",
        },
        {
          idx: "02",
          tag: "AI",
          t: "3–5x faster, same standard",
          b: "I use Claude Code and AI tooling to research, implement and validate. That compresses the calendar, not the quality: architecture, QA and stability stay my call and my responsibility.",
        },
        {
          idx: "03",
          tag: "OPERATIONS",
          t: "I come from keeping production alive",
          b: "My foundation is technical support and production infrastructure: real incidents, real maintenance, decisions with consequences. I build for day 200, not for the demo.",
        },
      ],
      ticker: [
        { t: "svc:internal_systems", v: "available", k: "ok" },
        { t: "svc:private_ai_infra", v: "available", k: "ok" },
        { t: "delivery:target", v: "2-4 weeks", k: "ok" },
        { t: "pricing:model", v: "fixed", k: "ok" },
        { t: "stack:node_react", v: "production", k: "ok" },
        { t: "infra:proxmox", v: "self-hosted", k: "ok" },
        { t: "ai:ollama", v: "local_only", k: "ok" },
        { t: "auth:ldaps", v: "integrated", k: "ok" },
        { t: "ai:assist", v: "human_owned", k: "ok" },
        { t: "calendar:q3_2026", v: "slots open", k: "warn" },
      ],
      footnoteHero: "// brand: KORA · operator: SELA · version: 2026.07",
      proofEyebrow: "// 04 — PROOF",
      closingTitle: "Still fighting with spreadsheets?",
      closingText: "Tell me which process is costing you time. I'll tell you if it can be solved, what it costs, and when you'd have it — no commitment.",
      closingCta: "Message me on WhatsApp",
    },
  },

  // ──────────────────────────────────────────────
  projects: {
    es: {
      eyebrow: "// 01 — CASOS",
      title: "Sistemas en producción.",
      sub: "Software e infraestructura que hoy sostienen la operación diaria de una empresa. No son maquetas: están en uso.",
      featuredLabel: "CASOS DE PRODUCCIÓN",
      labLabel: "LABORATORIO",
      labText: "Proyectos propios para experimentar y validar ideas antes de llevarlas a un cliente.",
    },
    en: {
      eyebrow: "// 01 — CASES",
      title: "Systems in production.",
      sub: "Software and infrastructure currently running a company's daily operation. Not mockups: they are in use.",
      featuredLabel: "PRODUCTION CASES",
      labLabel: "LAB",
      labText: "Personal projects used to experiment and validate ideas before taking them to a client.",
    },
  },

  // PROJECT ITEMS
  items: [
    {
      slug: "fares",
      featured: true,
      live: "https://faresbcs.com/",
      title: { es: "FARES — De la web al portal, la app móvil y la infraestructura", en: "FARES — From website to portal, mobile app and infrastructure" },
      desc: {
        es: "Relación de años en cuatro etapas: sitio web, portal de inspecciones, app móvil offline-first para trabajo en campo y, finalmente, el dominio corporativo que hoy unifica el acceso a todo.",
        en: "A multi-year relationship in four stages: website, inspection portal, offline-first mobile app for fieldwork, and finally the corporate domain that now unifies access to everything.",
      },
      tags: ["React (Vite)", "Node.js / Express", "React Native (Expo)", "Offline-first", "Windows Server", "Active Directory"],
      routeKey: "caseFares",
    },
    {
      slug: "contago",
      featured: true,
      live: "https://contago.com.co/",
      title: { es: "ContaGO — Portal de herramientas contables", en: "ContaGO — Accounting tools portal" },
      desc: {
        es: "Trabajo en curso con una firma contable: sitio web y un portal donde automatizamos su proceso de causación de documentos e integramos su software contable. Ellos ponen el criterio contable; yo lo convierto en sistema.",
        en: "Ongoing work with an accounting firm: website plus a portal automating their document-filing process and integrating their accounting software. They bring the accounting judgment; I turn it into a system.",
      },
      tags: ["Express / TypeScript", "React (Vite)", "Google Drive & Sheets API", "Siigo API", "En curso"],
      routeKey: "caseContaGo",
    },
    {
      slug: "iroha",
      featured: false,
      title: { es: "Iroha — Servidor propio con IA local", en: "Iroha — Self-hosted server with local AI" },
      desc: {
        es: "Mi laboratorio permanente: Proxmox, virtualización y modelos de IA corriendo en GPU local. Lo que ofrezco de infraestructura, primero lo opero aquí.",
        en: "My permanent lab: Proxmox, virtualization and AI models running on local GPUs. Whatever infrastructure I offer, I run it here first.",
      },
      tags: ["Proxmox", "Ollama", "Self-hosting", "GPU"],
      routeKey: null,
    },
    {
      slug: "automation-scripts",
      featured: false,
      title: { es: "Automatizaciones — scripts y utilidades", en: "Automations — scripts and utilities" },
      desc: {
        es: "Herramientas pequeñas para tareas repetitivas: validaciones, formatos, integraciones y sincronización entre sistemas.",
        en: "Small tools for repetitive tasks: validations, formatting, integrations and system-to-system syncing.",
      },
      tags: ["Node.js", "Python", "Scripting"],
      routeKey: null,
    },
  ],

  // ──────────────────────────────────────────────
  about: {
    es: {
      eyebrow: "// 03 — SOBRE",
      title: "Jose, alias Sela.",
      sub: "Quién soy, qué representa Sela y cómo trabajo Kora como servicio.",
      photoLabel: ["FOTO", "EN", "ACTUALIZACIÓN"],
      p1: "Soy Jose. Sela no es solo un apodo: es mi marca personal y mi firma de trabajo, la forma en la que estructuro y ejecuto proyectos de principio a fin.",
      p2: "Con Kora construyo sistemas internos a medida y monto infraestructura propia para empresas. Trabajo con dos tipos de cliente: el que necesita reemplazar un proceso manual por software que le encaje, y el que quiere sus servidores y su IA dentro de su propia red.",
      p3: "Mi base viene del soporte técnico y de operar sistemas en producción: incidentes reales, mantenimiento continuo y decisiones con impacto. No soy experto en el negocio de mis clientes, y no pretendo serlo: cuando el dominio es especializado, construyo junto a quien sí lo domina. Mi trabajo es traducir ese conocimiento a un sistema que funcione.",
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
        "Alcance y precio cerrados antes de empezar. Sin sorpresas por hora.",
        "Iteraciones cortas: ves algo funcionando en la primera semana.",
        "Uso IA para acelerar el proceso, no para delegar la responsabilidad.",
        "Después de entregar, ofrezco soporte mensual si lo quieres.",
      ],
      ctaTitle: "¿Tienes un proceso que te está costando tiempo?",
      ctaText: "Cuéntame cuál es y te digo si se puede resolver, cuánto cuesta y en cuánto lo tienes.",
      ctaBtn: "Hablemos",
    },
    en: {
      eyebrow: "// 03 — ABOUT",
      title: "Jose, aka Sela.",
      sub: "Who I am, what Sela represents and how I run Kora as a service.",
      photoLabel: ["PHOTO", "BEING", "UPDATED"],
      p1: "I am Jose. Sela is not just a nickname; it is my personal brand and professional signature, the way I structure and execute projects end to end.",
      p2: "Through Kora I build custom internal systems and stand up self-hosted infrastructure for companies. I work with two kinds of client: the one who needs to replace a manual process with software that actually fits, and the one who wants their servers and their AI inside their own network.",
      p3: "My foundation comes from technical support and production operations: real incidents, ongoing maintenance and high-impact decisions. I am not an expert in my clients' business, and I don't pretend to be: when the domain is specialized, I build alongside the people who own it. My job is to translate that knowledge into a system that works.",
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
        "Scope and price fixed before we start. No hourly surprises.",
        "Short iterations: you see something working in the first week.",
        "I use AI to accelerate execution, not to outsource accountability.",
        "After delivery, ongoing monthly support if you want it.",
      ],
      ctaTitle: "Is a manual process eating your team's time?",
      ctaText: "Tell me which one, and I'll tell you if it can be solved, what it costs, and when you'd have it.",
      ctaBtn: "Let's talk",
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
      eyebrow: "// 05 — CONTACTO",
      title: "Cotiza tu sistema.",
      sub: "Cuéntame qué proceso quieres resolver y te respondo con alcance, precio y tiempo de entrega. Si no es para mí, te lo digo directamente.",
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
      ctaWa: "Cotizar por WhatsApp",
      whatsappPrefill:
        "Hola Jose, vi tu portafolio de Kora by Sela.\n\n· Proceso que quiero resolver:\n· Cómo lo manejamos hoy (Excel, papel, otro software):\n· Cuántas personas lo usarían:\n\nMe gustaría una cotización.",
      scopeTitle: "Qué necesito saber para cotizarte",
      scopeText: "Con estos tres datos te doy un rango de precio y tiempo en la primera respuesta:",
      scopeBullets: [
        "Qué proceso quieres resolver o automatizar.",
        "Cómo lo manejan hoy (Excel, papel, un software que no les sirve).",
        "Cuántas personas van a usar el sistema.",
      ],
    },
    en: {
      eyebrow: "// 05 — CONTACT",
      title: "Get a quote.",
      sub: "Tell me which process you want to solve and I'll reply with scope, price and delivery time. If it's not a fit, I'll say so upfront.",
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
      ctaWa: "Quote via WhatsApp",
      whatsappPrefill:
        "Hi Jose, I found your Kora by Sela portfolio.\n\n· Process I want to solve:\n· How we handle it today (spreadsheets, paper, other software):\n· How many people would use it:\n\nI'd like a quote.",
      scopeTitle: "What I need in order to quote you",
      scopeText: "With these three details I can give you a price and time range in my first reply:",
      scopeBullets: [
        "Which process you want to solve or automate.",
        "How you handle it today (spreadsheets, paper, software that doesn't fit).",
        "How many people will use the system.",
      ],
    },
  },

  // ──────────────────────────────────────────────
  // CASE STUDIES — keyed by slug
  cases: {
    fares: {
      es: {
        eyebrow: "// CASO — FARES",
        title: "Cuatro etapas, una relación de años.",
        sub: "Empezó como un sitio web. Después vino el portal de inspecciones, la app móvil para trabajo en campo y, al final, la infraestructura que hoy unifica el acceso a todo.",
        tags: ["React (Vite)", "Node.js / Express", "React Native (Expo)", "Offline-first", "Railway", "Windows Server", "Active Directory", "LDAPS", "Python"],
        meta: [
          { k: "ETAPAS", v: "Web · Portal · Móvil · Infra" },
          { k: "STACK", v: "React · Node · React Native" },
          { k: "DOMINIO", v: "fares.local" },
          { k: "ESTADO", v: "En producción" },
        ],
        summary:
          "Con FARES no hubo un proyecto, hubo cuatro, cada uno abriendo la puerta al siguiente. Empezamos por la web, seguimos con el portal que reemplazó el registro manual de inspecciones, lo llevamos al campo con una app móvil que funciona sin señal y terminamos montando el dominio corporativo que hoy le da una sola identidad a todo el sistema.",
        sections: [
          {
            idx: "01",
            t: "La web",
            body: "El punto de partida fue una presencia web real. La empresa tenía un sitio informativo en WordPress que ya no representaba lo que hacía ni cómo trabajaba.",
            bullets: [
              "Sitio nuevo, con foco en claridad y velocidad.",
              "Primera base de confianza para todo lo que vino después.",
            ],
          },
          {
            idx: "02",
            t: "El portal de inspecciones",
            body: "Con la web resuelta, apareció el problema de verdad: la operación diaria vivía en planillas. Sin trazabilidad, sin saber quién registró qué, y consultar el histórico dependía de personas.",
            bullets: [
              "Frontend en React (Vite) para uso diario y rápido.",
              "Backend en Node.js / Express con la lógica de negocio.",
              "Roles y permisos: cada perfil ve y hace solo lo suyo.",
              "Despliegue en Railway, con evolución continua.",
            ],
          },
          {
            idx: "03",
            t: "La app móvil, pensada para trabajar sin señal",
            body: "Las inspecciones no ocurren en un escritorio, y muchas veces tampoco donde hay cobertura. La app se construyó offline-first: el inspector registra todo sin conexión y el sistema se encarga de sincronizar cuando vuelve la red.",
            bullets: [
              "App en React Native (Expo), consumiendo el mismo backend del portal.",
              "Inspecciones y fotos capturadas sin conexión, en el sitio donde ocurren.",
              "Cola de sincronización persistente, con reintentos y sin registros duplicados.",
              "Autenticación por dispositivo: credenciales en el llavero del teléfono, no en la app.",
            ],
          },
          {
            idx: "04",
            t: "La infraestructura",
            body: "Con el software funcionando, quedó a la vista el problema de abajo: cada computador era una isla. Cuentas locales, unidades de red mapeadas a mano y dar de baja a un empleado significaba recorrer los escritorios.",
            bullets: [
              "Controlador de dominio `FLI-DC` sobre Windows Server.",
              "Dominio `fares.local` con DNS y servicios de directorio.",
              "Estructura de OUs alineada a las áreas de la empresa.",
              "GPOs para el mapeo automático de unidades de red.",
            ],
          },
          {
            idx: "05",
            t: "La pieza que cierra el círculo",
            body: "Habiendo montado el directorio yo mismo, no tenía sentido mantener una segunda base de usuarios. Integré el portal contra ese mismo Active Directory, mediante un módulo de sincronización en Python sobre LDAPS.",
            bullets: [
              "Módulo `ad_sync.py` que sincroniza usuarios desde el directorio.",
              "Conexión cifrada vía LDAPS, sin exponer credenciales a la aplicación.",
              "El empleado entra al portal con la misma cuenta de su computador.",
              "Altas y bajas en un único lugar. Quien sale, sale de todo.",
            ],
          },
          {
            idx: "06",
            t: "Resultado",
            body: "La operación pasó del papel a una herramienta de trabajo real, y la administración pasó de ser máquina por máquina a ser centralizada.",
            bullets: [
              "Inspecciones centralizadas, con trazabilidad de quién hizo qué.",
              "Captura en campo desde el móvil, sin repetir el trabajo.",
              "Una sola identidad corporativa para el equipo y para el sistema.",
              "Base modular lista para crecer sin rehacer lo existente.",
            ],
          },
          {
            idx: "07",
            t: "Seguimos trabajando",
            body: "Ninguna de las cuatro etapas fue una entrega y adiós. La relación sigue activa, con mejoras iterativas y soporte según el uso real del equipo.",
            bullets: [
              "Correcciones y mejoras a partir de feedback real.",
              "Evolución por módulos para proteger la estabilidad.",
              "Acompañamiento técnico continuo en producción.",
            ],
          },
        ],
      },
      en: {
        eyebrow: "// CASE — FARES",
        title: "Four stages, a multi-year relationship.",
        sub: "It started as a website. Then came the inspection portal, the mobile app for fieldwork, and finally the infrastructure that now unifies access to everything.",
        tags: ["React (Vite)", "Node.js / Express", "React Native (Expo)", "Offline-first", "Railway", "Windows Server", "Active Directory", "LDAPS", "Python"],
        meta: [
          { k: "STAGES", v: "Web · Portal · Mobile · Infra" },
          { k: "STACK", v: "React · Node · React Native" },
          { k: "DOMAIN", v: "fares.local" },
          { k: "STATE", v: "In production" },
        ],
        summary:
          "With FARES there was not one project but four, each opening the door to the next. We started with the website, moved on to the portal that replaced manual inspection logging, took it into the field with a mobile app that works without signal, and finally deployed the corporate domain that today gives the whole system a single identity.",
        sections: [
          {
            idx: "01",
            t: "The website",
            body: "The starting point was a real web presence. The company had an informational WordPress site that no longer reflected what it did or how it worked.",
            bullets: [
              "A new site, focused on clarity and speed.",
              "The first foundation of trust for everything that followed.",
            ],
          },
          {
            idx: "02",
            t: "The inspection portal",
            body: "With the site resolved, the real problem surfaced: daily operations lived in paper forms. No traceability, no record of who logged what, and searching history depended on specific people.",
            bullets: [
              "React (Vite) frontend for fast daily use.",
              "Node.js / Express backend holding the business logic.",
              "Roles and permissions: each profile sees and does only its part.",
              "Deployed on Railway, with continuous evolution.",
            ],
          },
          {
            idx: "03",
            t: "The mobile app, built to work without signal",
            body: "Inspections do not happen at a desk, and often not where there is coverage either. The app was built offline-first: the inspector records everything without a connection, and the system syncs once the network returns.",
            bullets: [
              "React Native (Expo) app, consuming the same backend as the portal.",
              "Inspections and photos captured offline, where the work happens.",
              "Persistent sync queue, with retries and no duplicate records.",
              "Device-based auth: credentials live in the phone's keychain, not in the app.",
            ],
          },
          {
            idx: "04",
            t: "The infrastructure",
            body: "With the software running, the problem underneath became visible: every computer was an island. Local accounts, network drives mapped by hand, and offboarding an employee meant a tour of every desk.",
            bullets: [
              "`FLI-DC` domain controller on Windows Server.",
              "`fares.local` domain with DNS and directory services.",
              "OU structure aligned to the company's departments.",
              "GPOs for automatic network drive mapping.",
            ],
          },
          {
            idx: "05",
            t: "The piece that closes the loop",
            body: "Having deployed the directory myself, maintaining a second user database made no sense. I integrated the portal against that same Active Directory, through a Python sync module over LDAPS.",
            bullets: [
              "An `ad_sync.py` module syncing users from the directory.",
              "Encrypted LDAPS connection, without exposing credentials to the app.",
              "Employees sign in to the portal with the same account they use on their computer.",
              "Onboarding and offboarding in one place. Who leaves, leaves everything.",
            ],
          },
          {
            idx: "06",
            t: "Outcome",
            body: "Operations went from paper to a real work tool, and administration went from machine-by-machine to centralized.",
            bullets: [
              "Centralized inspections with traceability of who did what.",
              "Field capture from mobile, without repeating the work.",
              "One corporate identity for the team and for the system.",
              "A modular base ready to grow without rework.",
            ],
          },
          {
            idx: "07",
            t: "Still working together",
            body: "None of the four stages was a deliver-and-leave. The relationship is active, with iterative improvements and support driven by real team usage.",
            bullets: [
              "Fixes and improvements driven by real feedback.",
              "Module-based evolution to protect stability.",
              "Ongoing technical ownership in production.",
            ],
          },
        ],
      },
    },
    contago: {
      es: {
        eyebrow: "// CASO — CONTAGO",
        title: "Del sitio web al portal de herramientas contables.",
        sub: "Trabajo en curso con una firma contable. Ellos ponen el criterio contable; yo lo convierto en software que les ahorra horas cada semana.",
        tags: ["Express / TypeScript", "React (Vite)", "Google Drive & Sheets API", "Siigo API", "Automatización", "En curso"],
        meta: [
          { k: "ROL", v: "Desarrollo + arquitectura" },
          { k: "STACK", v: "React · Express · TypeScript" },
          { k: "MODELO", v: "Co-diseño con su equipo" },
          { k: "ESTADO", v: "En curso" },
        ],
        summary:
          "Empezamos por la web y terminamos construyendo juntos un portal de herramientas internas. Yo no soy contador: el equipo de ContaGO define qué debe hacer cada herramienta y por qué, y yo me encargo de que exista, funcione y no se caiga.",
        sections: [
          {
            idx: "01",
            t: "El punto de partida: la web",
            body: "El primer encargo fue el sitio corporativo: comunicar con claridad quiénes son y qué servicios prestan, con una base técnica rápida e indexable.",
            bullets: [
              "Sitio estático rápido, ligero y con estructura SEO limpia.",
              "Arquitectura de información y páginas de servicios.",
              "Componentes reutilizables para crecer en contenido.",
            ],
          },
          {
            idx: "02",
            t: "El portal de herramientas",
            body: "Con la web en marcha, la conversación se movió hacia adentro: qué partes de su trabajo diario podían dejar de hacerse a mano. De ahí nació el portal interno.",
            bullets: [
              "Frontend en React (Vite); backend en Express + TypeScript.",
              "Autenticación y acceso controlado a las herramientas internas.",
              "Cada herramienta nace de un proceso que su equipo ya hacía manualmente.",
            ],
          },
          {
            idx: "03",
            t: "Automatizar la causación de documentos",
            body: "Su proceso de causación implicaba cruzar documentos a mano, unirlos y archivarlos uno por uno. Lo convertimos en un flujo automático de principio a fin.",
            bullets: [
              "Cruce automático entre el documento recibido y su registro en hoja de cálculo.",
              "Consolidación de los PDF correspondientes en un único documento final.",
              "Archivado automático en Drive, en la estructura de año y mes que ya usaban.",
              "El flujo se dispara desde un asistente interno del equipo, sin tocar el servidor.",
            ],
          },
          {
            idx: "04",
            t: "Integrar el software contable que ya usan",
            body: "Una herramienta interna que no habla con el sistema contable de la firma obliga a digitar dos veces. Construí la integración contra Siigo para cerrar esa brecha.",
            bullets: [
              "Servicio de integración dedicado, con sus rutas aisladas del resto del portal.",
              "Autenticación por token para el acceso desde el portal y desde el asistente interno.",
              "Base preparada para nuevas operaciones sin rehacer la integración.",
            ],
          },
          {
            idx: "05",
            t: "Cómo trabajamos",
            body: "Este caso es el mejor ejemplo de cómo trabajo cuando el dominio no es mío. No pretendo entender de causación, retenciones ni cumplimiento tributario mejor que un contador. Lo que hago es escuchar, modelar el proceso y construirlo.",
            bullets: [
              "Ellos definen la regla contable; yo la traduzco a código y la valido con ellos.",
              "Iteraciones cortas sobre procesos reales, no sobre supuestos.",
              "Si una herramienta no le ahorra tiempo a alguien, no se construye.",
            ],
          },
          {
            idx: "06",
            t: "En curso",
            body: "El portal sigue creciendo. Cada tanto aparece otro proceso manual que vale la pena automatizar, y esa es exactamente la forma en la que quiero trabajar con mis clientes.",
            bullets: [
              "Nuevas herramientas priorizadas por el tiempo que ahorran.",
              "Mantenimiento y soporte continuo del portal y las integraciones.",
            ],
          },
        ],
      },
      en: {
        eyebrow: "// CASE — CONTAGO",
        title: "From the website to a portal of accounting tools.",
        sub: "Ongoing work with an accounting firm. They bring the accounting judgment; I turn it into software that saves them hours every week.",
        tags: ["Express / TypeScript", "React (Vite)", "Google Drive & Sheets API", "Siigo API", "Automation", "Ongoing"],
        meta: [
          { k: "ROLE", v: "Development + architecture" },
          { k: "STACK", v: "React · Express · TypeScript" },
          { k: "MODEL", v: "Co-designed with their team" },
          { k: "STATE", v: "Ongoing" },
        ],
        summary:
          "We started with the website and ended up building a portal of internal tools together. I am not an accountant: the ContaGO team defines what each tool must do and why, and I make sure it exists, works, and stays up.",
        sections: [
          {
            idx: "01",
            t: "The starting point: the website",
            body: "The first engagement was the corporate site: communicate clearly who they are and what they offer, on a fast, indexable technical base.",
            bullets: [
              "Fast, light static site with clean SEO structure.",
              "Information architecture and service pages.",
              "Reusable components to grow in content.",
            ],
          },
          {
            idx: "02",
            t: "The tools portal",
            body: "With the site live, the conversation moved inward: which parts of their daily work could stop being done by hand. That is where the internal portal came from.",
            bullets: [
              "React (Vite) frontend; Express + TypeScript backend.",
              "Authentication and controlled access to the internal tools.",
              "Every tool comes from a process their team already did manually.",
            ],
          },
          {
            idx: "03",
            t: "Automating document filing",
            body: "Their filing process meant cross-referencing documents by hand, merging them and archiving them one by one. We turned it into an automatic end-to-end flow.",
            bullets: [
              "Automatic matching between an incoming document and its spreadsheet record.",
              "Merging the corresponding PDFs into a single final document.",
              "Automatic archiving to Drive, in the year/month structure they already used.",
              "The flow is triggered from an internal team assistant, without touching the server.",
            ],
          },
          {
            idx: "04",
            t: "Integrating the accounting software they already use",
            body: "An internal tool that does not talk to the firm's accounting system forces double data entry. I built the Siigo integration to close that gap.",
            bullets: [
              "A dedicated integration service, with routes isolated from the rest of the portal.",
              "Token-based authentication for access from the portal and the internal assistant.",
              "A base ready for new operations without redoing the integration.",
            ],
          },
          {
            idx: "05",
            t: "How we work",
            body: "This case is the clearest example of how I work when the domain is not mine. I do not claim to understand filing, withholdings or tax compliance better than an accountant. What I do is listen, model the process, and build it.",
            bullets: [
              "They define the accounting rule; I translate it into code and validate it with them.",
              "Short iterations over real processes, not assumptions.",
              "If a tool does not save someone time, it does not get built.",
            ],
          },
          {
            idx: "06",
            t: "Ongoing",
            body: "The portal keeps growing. Every so often another manual process shows up that is worth automating, and that is exactly how I want to work with my clients.",
            bullets: [
              "New tools prioritized by the time they save.",
              "Ongoing maintenance and support of the portal and its integrations.",
            ],
          },
        ],
      },
    },
  },

  // ──────────────────────────────────────────────
  demos: {
    es: {
      eyebrow: "// 06 — DEMOS",
      title: "Cómo se ve lo que construyo.",
      sub: "Flujos interactivos que muestran el tipo de sistema interno que entrego: paneles, roles y automatizaciones. Datos locales de simulación.",
    },
    en: {
      eyebrow: "// 06 — DEMOS",
      title: "What I build, in miniature.",
      sub: "Interactive flows showing the kind of internal system I deliver: dashboards, roles and automations. Local simulated data.",
    },
    items: [
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
