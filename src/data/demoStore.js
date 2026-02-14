import { readStorageItem, removeStorageItem, writeStorageItem } from "../app/storage.js";

const BLOG_STORAGE_KEY_PREFIX = "kora_demo_blog_posts_v1";
const AUTH_STORAGE_KEY = "kora_demo_auth_session_v1";
const ROLE_WORKSPACE_STORAGE_KEY = "kora_demo_auth_roles_workspace_v1";

const DEMO_ROLE_ADMIN = "Admin";
const DEMO_ROLE_USER = "User";

const ROLE_ACTIONS = Object.freeze(["sync", "report", "audit"]);

export const DEMO_AUTH_USERS = Object.freeze([
  Object.freeze({
    id: "demo-admin",
    email: "admin@korabysela.dev",
    password: "kora-admin-2026",
    role: DEMO_ROLE_ADMIN,
    name: "Sela Admin",
  }),
  Object.freeze({
    id: "demo-user",
    email: "user@korabysela.dev",
    password: "kora-user-2026",
    role: DEMO_ROLE_USER,
    name: "Kora User",
  }),
]);

export const DEMO_AUTH_CREDENTIALS = {
  email: DEMO_AUTH_USERS[0].email,
  password: DEMO_AUTH_USERS[0].password,
};

function normalizeLocale(locale) {
  return locale === "en" ? "en" : "es";
}

function normalizeRole(role) {
  return role === DEMO_ROLE_ADMIN ? DEMO_ROLE_ADMIN : DEMO_ROLE_USER;
}

function normalizeAction(action) {
  return ROLE_ACTIONS.includes(action) ? action : null;
}

function getBlogStorageKey(locale) {
  return `${BLOG_STORAGE_KEY_PREFIX}_${normalizeLocale(locale)}`;
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

function toIsoDate(value, fallback = new Date().toISOString()) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function sanitizePost(post, locale, index, existingPosts) {
  if (!post || typeof post !== "object") return null;

  const title = typeof post.title === "string" ? post.title.trim() : "";
  const content = typeof post.content === "string" ? post.content.trim() : "";
  if (!title || !content) return null;

  const safeId = typeof post.id === "string" && post.id.trim().length > 0 ? post.id : createId();
  const slugCandidate =
    slugify(typeof post.slug === "string" ? post.slug : "") || slugify(title) || `demo-post-${index + 1}`;

  const safeSlug = ensureUniqueSlug(slugCandidate, existingPosts, safeId);
  const createdAt = toIsoDate(post.createdAt);

  return {
    id: safeId,
    slug: safeSlug,
    title,
    excerpt: typeof post.excerpt === "string" ? post.excerpt.trim() : "",
    content,
    tags: Array.isArray(post.tags)
      ? post.tags
          .filter((tag) => typeof tag === "string" && tag.trim().length > 0)
          .map((tag) => tag.trim())
          .slice(0, 10)
      : [],
    status: post.status === "published" ? "published" : "draft",
    author: typeof post.author === "string" && post.author.trim().length > 0 ? post.author.trim() : "Kora by Sela",
    createdAt,
    updatedAt: toIsoDate(post.updatedAt, createdAt),
    locale,
  };
}

function sanitizePosts(posts, locale) {
  if (!Array.isArray(posts)) return [];

  const safeLocale = normalizeLocale(locale);
  return posts.reduce((accumulator, post, index) => {
    const sanitized = sanitizePost(post, safeLocale, index, accumulator);
    if (sanitized) {
      accumulator.push(sanitized);
    }
    return accumulator;
  }, []);
}

function sanitizeSession(session) {
  if (!session || typeof session !== "object") return null;

  const email = typeof session.email === "string" ? session.email.trim().toLowerCase() : "";
  if (!email) return null;

  const matchedUser = DEMO_AUTH_USERS.find((user) => user.email === email);
  const roleFromSession = typeof session.role === "string" && session.role.trim().length > 0 ? session.role.trim() : null;

  return {
    id: typeof session.id === "string" && session.id.trim().length > 0 ? session.id : createId(),
    email,
    role: normalizeRole(roleFromSession ?? matchedUser?.role),
    name:
      typeof session.name === "string" && session.name.trim().length > 0
        ? session.name.trim()
        : matchedUser?.name ?? "Demo User",
    loginAt: toIsoDate(session.loginAt),
  };
}

function sanitizeRoleRequest(request) {
  if (!request || typeof request !== "object") return null;

  const action = normalizeAction(request.action);
  const requestedBy = typeof request.requestedBy === "string" ? request.requestedBy.trim().toLowerCase() : "";
  const status = typeof request.status === "string" ? request.status.trim().toLowerCase() : "pending";

  if (!action || !requestedBy) {
    return null;
  }

  const safeStatus = status === "approved" || status === "rejected" ? status : "pending";

  return {
    id: typeof request.id === "string" && request.id.trim().length > 0 ? request.id : createId(),
    action,
    requestedBy,
    requestedAt: toIsoDate(request.requestedAt),
    status: safeStatus,
    reviewedBy: typeof request.reviewedBy === "string" ? request.reviewedBy.trim().toLowerCase() : "",
    reviewedAt: request.reviewedAt ? toIsoDate(request.reviewedAt) : null,
  };
}

function sanitizeRoleWorkspace(workspace) {
  const base = workspace && typeof workspace === "object" ? workspace : {};
  const rawPermissions = base.permissions && typeof base.permissions === "object" ? base.permissions : {};

  const permissions = ROLE_ACTIONS.reduce((accumulator, action) => {
    accumulator[action] = Boolean(rawPermissions[action]);
    return accumulator;
  }, {});

  const requests = Array.isArray(base.requests)
    ? base.requests
        .map((request) => sanitizeRoleRequest(request))
        .filter(Boolean)
        .sort((a, b) => new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime())
        .slice(0, 40)
    : [];

  return {
    permissions,
    requests,
  };
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
        author: "Kora by Sela",
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
        author: "Kora by Sela",
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
        author: "Kora by Sela",
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
      author: "Kora by Sela",
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
      author: "Kora by Sela",
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
      author: "Kora by Sela",
      createdAt: new Date(now - 86400000).toISOString(),
      updatedAt: new Date(now - 86400000).toISOString(),
    },
  ];
}

export function loadDemoPosts(locale = "es") {
  const safeLocale = normalizeLocale(locale);
  const seed = getSeedPosts(safeLocale);
  const raw = readStorageItem(getBlogStorageKey(safeLocale));

  if (!raw) {
    return seed;
  }

  try {
    const parsed = JSON.parse(raw);
    const sanitized = sanitizePosts(parsed, safeLocale);

    if (sanitized.length === 0) {
      return seed;
    }

    return sanitized;
  } catch {
    return seed;
  }
}

export function saveDemoPosts(posts, locale = "es") {
  const safeLocale = normalizeLocale(locale);
  const sanitized = sanitizePosts(posts, safeLocale);
  writeStorageItem(getBlogStorageKey(safeLocale), JSON.stringify(sanitized));
}

export function resetDemoPosts(locale = "es") {
  const safeLocale = normalizeLocale(locale);
  const seed = getSeedPosts(safeLocale);
  saveDemoPosts(seed, safeLocale);
  return seed;
}

function getDemoAuthUserByEmail(email) {
  const safeEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  return DEMO_AUTH_USERS.find((user) => user.email === safeEmail) ?? null;
}

function getDemoAuthUserByCredentials(email, password) {
  const safeEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  return DEMO_AUTH_USERS.find((user) => user.email === safeEmail && user.password === password) ?? null;
}

function createDefaultRoleWorkspace() {
  return {
    permissions: {
      sync: false,
      report: false,
      audit: false,
    },
    requests: [],
  };
}

export function getDemoAuthUsers() {
  return DEMO_AUTH_USERS.map((user) => ({ ...user }));
}

export function loadDemoRoleWorkspace() {
  const raw = readStorageItem(ROLE_WORKSPACE_STORAGE_KEY);
  if (!raw) {
    return createDefaultRoleWorkspace();
  }

  try {
    const parsed = JSON.parse(raw);
    return sanitizeRoleWorkspace(parsed);
  } catch {
    return createDefaultRoleWorkspace();
  }
}

export function saveDemoRoleWorkspace(workspace) {
  const sanitized = sanitizeRoleWorkspace(workspace);
  writeStorageItem(ROLE_WORKSPACE_STORAGE_KEY, JSON.stringify(sanitized));
  return sanitized;
}

export function requestDemoRolePermission(action, requestedBy) {
  const safeAction = normalizeAction(action);
  const requester = typeof requestedBy === "string" ? requestedBy.trim().toLowerCase() : "";
  if (!safeAction || !requester) {
    return loadDemoRoleWorkspace();
  }

  const workspace = loadDemoRoleWorkspace();
  const alreadyGranted = Boolean(workspace.permissions[safeAction]);
  const pendingRequest = workspace.requests.some((request) => request.action === safeAction && request.status === "pending");

  if (alreadyGranted || pendingRequest) {
    return workspace;
  }

  const nextWorkspace = {
    ...workspace,
    requests: [
      {
        id: createId(),
        action: safeAction,
        requestedBy: requester,
        requestedAt: new Date().toISOString(),
        status: "pending",
        reviewedBy: "",
        reviewedAt: null,
      },
      ...workspace.requests,
    ].slice(0, 40),
  };

  return saveDemoRoleWorkspace(nextWorkspace);
}

export function reviewDemoRoleRequest(requestId, reviewerEmail, approved) {
  const reviewer = typeof reviewerEmail === "string" ? reviewerEmail.trim().toLowerCase() : "";
  if (!requestId || !reviewer) {
    return loadDemoRoleWorkspace();
  }

  const workspace = loadDemoRoleWorkspace();
  let approvedAction = null;

  const requests = workspace.requests.map((request) => {
    if (request.id !== requestId || request.status !== "pending") {
      return request;
    }

    if (approved) {
      approvedAction = request.action;
    }

    return {
      ...request,
      status: approved ? "approved" : "rejected",
      reviewedBy: reviewer,
      reviewedAt: new Date().toISOString(),
    };
  });

  const nextWorkspace = {
    ...workspace,
    requests,
    permissions:
      approvedAction === null
        ? workspace.permissions
        : {
            ...workspace.permissions,
            [approvedAction]: true,
          },
  };

  return saveDemoRoleWorkspace(nextWorkspace);
}

export function setDemoRolePermission(action, enabled) {
  const safeAction = normalizeAction(action);
  if (!safeAction) {
    return loadDemoRoleWorkspace();
  }

  const workspace = loadDemoRoleWorkspace();
  const nextWorkspace = {
    ...workspace,
    permissions: {
      ...workspace.permissions,
      [safeAction]: Boolean(enabled),
    },
  };

  return saveDemoRoleWorkspace(nextWorkspace);
}

export function resetDemoRoleWorkspace() {
  removeStorageItem(ROLE_WORKSPACE_STORAGE_KEY);
  return createDefaultRoleWorkspace();
}

export function loadDemoSession() {
  const raw = readStorageItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return sanitizeSession(parsed);
  } catch {
    return null;
  }
}

export function saveDemoSession(session) {
  const sanitized = sanitizeSession(session);
  if (!sanitized) return;

  writeStorageItem(AUTH_STORAGE_KEY, JSON.stringify(sanitized));
}

export function clearDemoSession() {
  removeStorageItem(AUTH_STORAGE_KEY);
}

export function createDemoSession(email) {
  const safeEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const matchedUser = getDemoAuthUserByEmail(safeEmail);

  return {
    id: createId(),
    email: matchedUser?.email ?? safeEmail,
    role: normalizeRole(matchedUser?.role),
    name: matchedUser?.name ?? "Demo User",
    loginAt: new Date().toISOString(),
  };
}

export function validateDemoCredentials(email, password) {
  return Boolean(getDemoAuthUserByCredentials(email, password));
}
