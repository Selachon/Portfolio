# KORA by Sela - Portfolio + Interactive Demo Lab

Portfolio web bilingue (ES/EN) construido con React + Vite, con una seccion de demos interactivas para mostrar capacidades reales de implementacion.

## Objetivo del proyecto

Este sitio no es solo un portafolio visual. Tambien funciona como laboratorio de demos para que potenciales clientes prueben flujos reales:

- Blog CMS demo (CRUD con persistencia local)
- Login/Auth demo (sesion persistente + dashboard protegido)
- B2B Automation demo (escenarios ejecutables y logs)

Ademas, incluye transiciones y sistema visual de marca `KORA by Sela`.

## Stack

- React 19
- React Router 7
- Framer Motion
- Vite
- CSS modular por secciones (sin framework externo)

## Scripts

```bash
npm install
npm run dev
npm run lint
npm run build
npm run preview
```

## Estructura principal

```txt
src/
  App.jsx                         # Orquestador principal (layout + transiciones)
  app/
    constants.js                  # Constantes globales de locale y duraciones
    paths.js                      # Utilidades de rutas (ej: isDemoPath)
    preferences.js                # Lectura inicial de tema/idioma
    hooks/
      useThemeState.js            # Estado de tema + persistencia
      useLocaleState.js           # Estado de idioma + persistencia
      useRouteScrollReset.js      # Reset de scroll por ruta
      usePortalTransition.js      # Estado del portal entre sitio y demos
      useRouteTransitionMeta.js   # Flags de transicion/layout
    routes/
      AppRoutes.jsx               # Mapa centralizado de rutas
    transitions/
      routeMotion.js              # Config de animaciones de ruta
  components/
    background/HexBackground.jsx  # Fondo panal dinamico con hover sutil
    demo/DemoFloatingNav.jsx      # Pill persistente de navegacion demo
    transitions/PortalTransition.jsx
  pages/
    ...                           # Paginas normales + demos
```

## Rutas

### Sitio principal

- `/`
- `/proyectos`, `/projects`
- `/sobre-mi`, `/about`
- `/contacto`, `/contact`
- `/caso/fares`, `/case/fares`

### Demo Lab

- `/demos`
- `/demos/blog`
- `/demos/blog/:slug`
- `/demos/login`
- `/demos/dashboard`
- `/demos/automation`

## Credenciales demo (Auth)

Definidas en `src/data/demoStore.js`:

- Email: `demo@korabysela.dev`
- Password: `kora2026`

## Como funciona la modularizacion

### 1) Estado global de UI

`App.jsx` no contiene logica pesada de negocio. Se apoya en hooks dedicados:

- `useThemeState`: aplica `data-theme` y guarda en `localStorage`
- `useLocaleState`: aplica `lang` y guarda locale
- `usePortalTransition`: controla cuando mostrar overlay portal
- `useRouteTransitionMeta`: flags derivados para animaciones y layout

### 2) Rutas separadas

`AppRoutes.jsx` centraliza todas las rutas en un solo arreglo (`ROUTE_DEFINITIONS`), facilitando agregar/quitar paginas sin tocar el core de App.

### 3) Transiciones encapsuladas

- `routeMotion.js` concentra los presets de animacion por tipo de navegacion.
- `PortalTransition.jsx` controla la animacion principal al cruzar entre sitio normal y demos.

## Persistencia local (localStorage)

Claves usadas:

- `theme`
- `locale`
- `kora_demo_blog_posts_v1`
- `kora_demo_auth_session_v1`

## Guia rapida para extender

### Agregar nueva pagina normal

1. Crear pagina en `src/pages/`
2. Agregar ruta en `src/app/routes/AppRoutes.jsx`
3. Agregar link en `Navbar` si aplica

### Agregar nuevo demo

1. Crear pagina en `src/pages/demos/`
2. Agregar ruta en `AppRoutes.jsx`
3. Agregar item en `DemoFloatingNav.jsx`
4. (Opcional) asignar estilo propio en `DemoLayout`/`theme.css`

### Ajustar animaciones

- Portal entre sitio y demos: `usePortalTransition.js` + `PortalTransition.jsx`
- Transicion de rutas: `routeMotion.js`

## Notas de mantenimiento

- Si cambias los nombres de rutas demo, revisa tambien `isDemoPath` y el active state de `DemoFloatingNav`.
- Si cambias variables de color global, revisa tambien las variables de hex background (`--hex-*`).
- Si percibes glitches visuales en navegacion, limpia cache del navegador (`Ctrl+Shift+R`) y vuelve a correr `npm run build`.

## Calidad minima antes de deploy

```bash
npm run lint
npm run build
```

Si ambos pasan, el estado es apto para publicar.
