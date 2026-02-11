const BLOG_STORAGE_KEY = "kora_demo_blog_posts_v1";
const AUTH_STORAGE_KEY = "kora_demo_auth_session_v1";

export const DEMO_AUTH_CREDENTIALS = {
  email: "demo@korabysela.dev",
  password: "kora2026",
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function fallbackId() {
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return fallbackId();
}

export function createClientId() {
  return createId();
}

export function slugify(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 72);
}

export function ensureUniqueSlug(baseSlug, posts, ignoreId) {
  const safeBase = baseSlug || "demo-post";
  let candidate = safeBase;
  let counter = 2;

  while (posts.some((post) => post.slug === candidate && post.id !== ignoreId)) {
    candidate = `${safeBase}-${counter}`;
    counter += 1;
  }

  return candidate;
}

function getSeedPosts(locale) {
  const now = Date.now();

  if (locale === "en") {
    return [
      {
        id: createId(),
        slug: "lead-automation-without-crm-chaos",
        title: "Lead automation without CRM chaos",
        excerpt:
          "A practical setup to capture leads, qualify intent, and route opportunities with consistent SLA.",
        content:
          "This demo article shows how to automate a B2B intake flow without turning your CRM into a mess.\n\nStart with explicit scoring rules, route by service line, and log every transition. Visibility is what keeps automation trustworthy in production.",
        tags: ["Automation", "B2B", "CRM"],
        status: "published",
        author: "KORA by Sela",
        createdAt: new Date(now - 86400000 * 9).toISOString(),
        updatedAt: new Date(now - 86400000 * 9).toISOString(),
      },
      {
        id: createId(),
        slug: "secure-demo-login-patterns",
        title: "Secure demo login patterns",
        excerpt:
          "How to demonstrate auth flows safely in a portfolio without exposing real customer data.",
        content:
          "A demo login should feel realistic but remain isolated.\n\nUse sandbox credentials, role gates, and clear session lifecycle. This helps potential clients evaluate UX and flow logic while keeping legal and security boundaries clean.",
        tags: ["Auth", "UX", "Security"],
        status: "published",
        author: "KORA by Sela",
        createdAt: new Date(now - 86400000 * 4).toISOString(),
        updatedAt: new Date(now - 86400000 * 4).toISOString(),
      },
      {
        id: createId(),
        slug: "shipping-fast-with-ai-and-review",
        title: "Shipping fast with AI and review",
        excerpt:
          "A draft note on balancing AI speed with human validation for production quality.",
        content:
          "Draft outline:\n- AI for rapid implementation\n- Human review for architecture decisions\n- Test gates before deployment",
        tags: ["AI", "Process", "Quality"],
        status: "draft",
        author: "KORA by Sela",
        createdAt: new Date(now - 86400000).toISOString(),
        updatedAt: new Date(now - 86400000).toISOString(),
      },
    ];
  }

  return [
    {
      id: createId(),
      slug: "automatizacion-de-leads-sin-caos-crm",
      title: "Automatización de leads sin caos en el CRM",
      excerpt:
        "Un flujo práctico para capturar leads, calificar intención y enrutar oportunidades con SLA claro.",
      content:
        "Este artículo demo muestra cómo automatizar intake B2B sin convertir el CRM en un desorden.\n\nLa base es definir reglas de scoring, enrutar por línea de servicio y registrar cada transición para mantener trazabilidad en producción.",
      tags: ["Automatización", "B2B", "CRM"],
      status: "published",
      author: "KORA by Sela",
      createdAt: new Date(now - 86400000 * 9).toISOString(),
      updatedAt: new Date(now - 86400000 * 9).toISOString(),
    },
    {
      id: createId(),
      slug: "patrones-seguros-para-login-demo",
      title: "Patrones seguros para login demo",
      excerpt:
        "Cómo mostrar autenticación en un portafolio sin exponer datos reales de clientes.",
      content:
        "Un login demo debe sentirse realista, pero aislado.\n\nCredenciales sandbox, permisos por rol y ciclo de sesión claro permiten evaluar UX y lógica sin comprometer seguridad ni legalidad.",
      tags: ["Auth", "UX", "Seguridad"],
      status: "published",
      author: "KORA by Sela",
      createdAt: new Date(now - 86400000 * 4).toISOString(),
      updatedAt: new Date(now - 86400000 * 4).toISOString(),
    },
    {
      id: createId(),
      slug: "entregar-rapido-con-ia-y-revision",
      title: "Entregar rápido con IA y revisión",
      excerpt:
        "Borrador sobre cómo equilibrar velocidad con IA y validación humana para calidad real.",
      content:
        "Borrador:\n- IA para acelerar implementación\n- Criterio humano para arquitectura\n- Pruebas y revisión antes de desplegar",
      tags: ["IA", "Proceso", "Calidad"],
      status: "draft",
      author: "KORA by Sela",
      createdAt: new Date(now - 86400000).toISOString(),
      updatedAt: new Date(now - 86400000).toISOString(),
    },
  ];
}

export function loadDemoPosts(locale = "es") {
  const seed = getSeedPosts(locale);

  if (!canUseStorage()) {
    return seed;
  }

  const raw = window.localStorage.getItem(BLOG_STORAGE_KEY);
  if (!raw) {
    return seed;
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return seed;
    }

    return parsed;
  } catch {
    return seed;
  }
}

export function saveDemoPosts(posts) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(posts));
}

export function resetDemoPosts(locale = "es") {
  const seed = getSeedPosts(locale);
  saveDemoPosts(seed);
  return seed;
}

export function loadDemoSession() {
  if (!canUseStorage()) return null;

  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.email) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDemoSession(session) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearDemoSession() {
  if (!canUseStorage()) return;
  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

export function createDemoSession(email) {
  return {
    id: createId(),
    email,
    role: "Admin",
    loginAt: new Date().toISOString(),
  };
}

export function validateDemoCredentials(email, password) {
  return email.trim().toLowerCase() === DEMO_AUTH_CREDENTIALS.email && password === DEMO_AUTH_CREDENTIALS.password;
}
