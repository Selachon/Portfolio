# Kora by Sela - Portfolio + Interactive Demo Lab

This repository is the source code for my public portfolio website (`Kora by Sela`).
It is both:

- a bilingual portfolio (ES/EN) with real case studies, and
- an interactive demo lab where clients can try product-like flows.

The goal is to show not only visual design, but also execution quality: architecture, UX decisions, maintainability, and shipping discipline.

## What Is Included

- Main pages: Home, Projects, About, Contact.
- Case studies:
  - FARES
  - ContaGO
- Interactive demos:
  - Blog CMS demo (local CRUD flow)
  - Role-based auth demo (Admin/User interaction)
  - Operations automation demo

## Tech Stack

- React 19
- React Router 7
- Framer Motion
- Lucide React
- Vite 7
- ESLint 9

No backend is required to run this project locally.

## Local Development

### Requirements

- Node.js 20+ (recommended)
- npm 10+

### Run Locally

```bash
npm ci
npm run dev
```

App runs on Vite default local server (`http://localhost:5173`).

### Build and Validate

```bash
npm run lint
npm run build
npm run preview
```

## Demo Credentials (Role Flow)

Defined in `src/data/demoStore.js`:

- Admin
  - Email: `admin@korabysela.dev`
  - Password: `kora-admin-2026`
- User
  - Email: `user@korabysela.dev`
  - Password: `kora-user-2026`

These credentials are intentionally demo-only and used for portfolio simulation.

## Project Structure

```txt
src/
  App.jsx
  app/
    constants.js
    paths.js
    preferences.js
    storage.js
    hooks/
    routes/
    transitions/
  components/
    background/
    demo/
    transitions/
  data/
  pages/
    demos/
  styles/
```

## Architecture Notes

- Routing is centralized in `src/app/routes/AppRoutes.jsx` using localized path helpers from `src/app/paths.js`.
- Theme and locale persistence are managed with safe storage wrappers (`src/app/storage.js`) to avoid browser storage edge-case crashes.
- Demo modules are lazy-loaded to keep the initial bundle focused on primary portfolio pages.
- Demo data persistence is local-only (`localStorage`) and scoped for simulation purposes.

## Security and Privacy

This repository is prepared to be public:

- No `.env` secrets are required or committed.
- No production credentials/tokens are present.
- A restrictive CSP is declared in `index.html`.
- GitHub Actions in deploy workflow are pinned to immutable SHAs.
- External links that open new tabs use safe `rel` attributes.

Additional verification used during maintenance:

```bash
npm audit --omit=dev
```

## Deploy

This project is configured for GitHub Pages deploy via:

- `.github/workflows/deploy-pages.yml`

Workflow builds with Vite, publishes `dist/`, and includes SPA fallback (`404.html`).

## Optional Feature Flags

Some experiments can be kept in code but hidden from production views. Example:

- `PHYSICS_LAYER_UNDER_CONSTRUCTION` in `src/App.jsx`

This allows preserving in-progress work without deleting implementation.

## Why This Repo Matters

For clients and collaborators, this codebase demonstrates:

- production-oriented frontend architecture,
- bilingual UX handling,
- realistic interactive demos for business workflows,
- attention to performance, maintainability, and delivery quality.
