# LIFT Fitness Center — Sistema de Gestión

Gym management system for LIFT Fitness Center San Salvador. Single-page app frontend + Node/Express/TypeScript backend + Supabase.

## Repo structure

```
lift-backend/          ← THIS repo (backend + bundled frontend)
  src/
    index.ts           ← Express app entry, Basic Auth, static serving, cron
    routes/            ← API routes (auth, members, payments, classes, etc.)
    middleware/        ← errorHandler, auth middleware
    types.ts           ← Shared TypeScript types
  public/
    index.html         ← Entire frontend SPA (vanilla JS, ~5300 lines)
    api-layer.js       ← Overrides localStorage calls with real fetch() to backend

lift-frontend/         ← Local-only copy served by Node in dev (NOT in git)
  index.html           ← Same file as public/index.html — keep in sync manually
  api-layer.js         ← Same as public/api-layer.js
```

> **Important:** The frontend lives in `public/index.html` (one big file). When editing it locally, you must also copy it to `../lift-frontend/index.html` so the local dev server picks it up:
> ```bash
> cp public/index.html ../lift-frontend/index.html
> ```

## Stack

- **Backend:** Node.js + Express + TypeScript
- **Database:** Supabase (PostgreSQL) — project ID `usbdbcpbcjovsqmpkrnm`
- **Frontend:** Vanilla JS SPA in a single HTML file. Fonts: Barlow Condensed + Barlow (Google Fonts)
- **Auth:** JWT (stored in `sessionStorage._lift_jwt`) for API calls. Basic Auth for the whole site (demo protection).
- **Deploy:** Railway (auto-deploys on push to `main`) → Cloudflare → ctrlgym.org

## Local dev setup

### Prerequisites
- Node.js 18+
- A `.env` file in `lift-backend/` (see below)

### Steps
```bash
git clone https://github.com/tomasmineoo-ctrl/lift-fitness-backend.git lift-backend
cd lift-backend
npm install
cp .env.example .env   # then fill in values
npm run dev            # ts-node-dev, hot reload on :3000
```

Open http://localhost:3000 — browser will prompt for Basic Auth.

### .env variables
```
SUPABASE_URL=https://usbdbcpbcjovsqmpkrnm.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<pedile a Tomas>
JWT_SECRET=<pedile a Tomas>
JWT_EXPIRES_IN=7d
NODE_ENV=development
FRONTEND_PATH=./public
DEMO_USER=<pedile a Tomas>
DEMO_PASS=<pedile a Tomas>
```

> `FRONTEND_PATH=./public` makes the local server serve from `lift-backend/public/` (same as production). Without it, the server looks for `../lift-frontend/` which only exists on Tomas's machine.

### Build & start (production-like)
```bash
npm run build    # tsc → dist/
npm start        # node dist/index.js
```

## Credentials (demo data)

| Role | Email | Password | PIN |
|---|---|---|---|
| Admin | admin@gym.com | Lift2025# | 0000 |
| Recepción | recep@gym.com | recep2025 | 1111 |
| Entrenador | trainer@gym.com | trainer2025 | 2222 |
| Nutrición | nutricion@gym.com | nutri2025 | 3333 |
| Socio | carlos@mail.com | 1234 | — |

Basic Auth (browser prompt): pedile las credenciales a Tomas

## Architecture notes

### Frontend SPA (`public/index.html`)
- All views rendered client-side via a `views` object: `views.dashboard()`, `views.usuarios()`, etc.
- Navigation: `navigate('viewName')` — renders into `#content`
- Data stored in `localStorage` (key `liftDB`) and synced from Supabase on login via `api-layer.js`
- `api-layer.js` overrides `window.saveDB`, `window.loadDB`, and specific render functions to call the real API using the JWT in `sessionStorage._lift_jwt`
- Role-based nav: admin sees everything, reception sees cobro/socios, trainer sees their students, nutritionist sees their panel, users see their profile

### Backend API (`src/routes/`)
- All routes under `/api/*` — Basic Auth middleware is skipped for these
- JWT required for most endpoints (validated in middleware)
- Key routes: `/api/auth/login`, `/api/members`, `/api/payments`, `/api/classes`, `/api/access`, `/api/admin/log`

### CSS design system (in `public/index.html` `<style>` block)
```
--bg: #0a0a0a        dark background
--surface: #111111   cards
--accent: #E5087E    pink (primary)
--indigo: #34388E    secondary brand color
Font: Barlow Condensed (headings/numbers) + Barlow (body)
```

## Deploy flow

1. Edit `public/index.html` (and/or `src/`)
2. `git add . && git commit -m "..." && git push origin main`
3. Railway auto-deploys in ~2 min
4. Purge Cloudflare cache:
```bash
# Pedile a Tomas el Zone ID y el CF Token
curl -X POST "https://api.cloudflare.com/client/v4/zones/<CF_ZONE_ID>/purge_cache" \
  -H "Authorization: Bearer <CF_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'
```

## Common tasks for Claude

- **Edit dashboard:** `public/index.html` → `views.dashboard()` function (~line 740)
- **Add API route:** `src/routes/<name>.ts` → register in `src/routes/index.ts`
- **Add nav item:** `adminNav` / `receptionNav` / `trainerNav` arrays in `public/index.html`
- **Add new view:** add to `views` object + add nav entry + handle in `buildSidebar()`
- **Styling:** add CSS to the `<style>` block at the top of `public/index.html`; follow existing utility class patterns

## Production URLs

- **App:** https://ctrlgym.org
- **Railway:** https://lift-fitness-production.up.railway.app
- **GitHub:** https://github.com/tomasmineoo-ctrl/lift-fitness-backend
- **Supabase:** https://supabase.com/dashboard/project/usbdbcpbcjovsqmpkrnm
