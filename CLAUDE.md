# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend
```bash
npm run build:css     # compile Tailwind once (no --minify, output is readable)
npm run watch:css     # watch mode during development
npx serve .           # serve static frontend locally
```

### Backend (`cd server` first)
```bash
npm run dev           # ts-node-dev with auto-reload (development)
npm run build         # tsc → dist/
npm start             # run compiled dist/index.js
```

### First-time backend setup
```bash
cd server && cp .env.example .env
# Fill in MONGODB_URI, JWT_SECRET, CSRF_SECRET
# Generate secrets: node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Health check: `GET http://localhost:4000/health`

## Architecture

### Split: static frontend + Express API
- The frontend is plain HTML/JS with no build step beyond Tailwind CSS. `index.html` loads `auth.js` then `script.js` — order matters, `auth.js` must come first.
- The backend lives entirely in `server/src/` and compiles to `server/dist/`. On Vercel, `server/src/app.ts` is the serverless entry; `server/src/index.ts` is the local dev entry that calls `app.listen`.

### Frontend state model
`script.js` owns an in-memory array `expense[]` that is the single source of truth for all views. Every add/edit/delete patches this array and re-renders the relevant views — there is no reactive framework. `auth.js` exposes two globals (`isLoggedIn`, `csrfToken`) that `script.js` depends on. `apiFetch()` wraps all API calls, automatically attaching credentials and the CSRF header.

Budget goals are stored in `localStorage` (`sw_budget_goals`) — they are user preferences, not server data.

### Auth & CSRF flow
1. On load, `auth.js` calls `GET /api/auth/csrf` to get a token and set the `sw_csrf` cookie.
2. Login/register sets a signed JWT in an HttpOnly `sw_session` cookie (7-day expiry).
3. Every `POST/PUT/DELETE` must include `x-csrf-token` — `apiFetch` does this automatically.
4. The JWT contains a `tokenVersion` (`tv`) field that is validated against the User document on every authenticated request. Changing password increments `tokenVersion`, immediately invalidating all live sessions.

### Adding a new API route
1. Create `server/src/routes/yourRoute.ts`, wrap handlers with `asyncHandler`.
2. Register in `server/src/app.ts` with `app.use("/api/your-route", expenseLimiter, yourRoutes)`.
3. Protect with `authRequired` middleware if the route needs authentication.
4. Call it from the frontend via `apiFetch('/your-route', { method: 'POST', body: JSON.stringify({...}) })`.

### Key constraints
- All expense queries on the server filter by `req.userId` — never expose cross-user data.
- State-changing requests that aren't `application/json` are rejected with 415 — always set `Content-Type: application/json` (handled automatically by `apiFetch`).
- Tailwind's content scan covers `index.html`, `auth.js`, and `script.js` — new classes added in those files are picked up on the next `build:css` run.
- The frontend uses DOM methods (not `innerHTML`) for user-supplied data to prevent XSS. Follow this pattern in `buildItemRow` and similar rendering functions.
