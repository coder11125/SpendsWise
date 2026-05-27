# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (Svelte 5 + Vite + Tailwind v4)
```bash
npm run dev           # Vite dev server with HMR (proxies /api → localhost:4000)
npm run build         # production build → dist/
npm run preview       # preview production build locally
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

### Split: Svelte 5 SPA + Express API
- The frontend is a Svelte 5 SPA built with Vite. Entry point is `index.html` → `src/app.js` → `src/App.svelte`.
- State is managed with Svelte 5 runes (`$state`, `$derived`) in `src/lib/state.svelte.js` — a shared reactive module.
- All API calls go through `apiFetch()` in `src/lib/api.js`, which automatically attaches credentials and CSRF header.
- The backend lives in `server/src/` and compiles to `server/dist/`. On Vercel, `server/src/app.ts` is the serverless entry; `server/src/index.ts` is the local dev entry.
- Vite dev server proxies `/api` → `localhost:4000` automatically.

### Frontend architecture
```
src/
├── lib/
│   ├── state.svelte.js      # Reactive state (runes-based getters/setters)
│   ├── api.js               # API wrapper + all endpoint functions
│   ├── currency.js          # Currency formatting/conversion
│   ├── calculations.svelte.js  # Async summary calculations
│   ├── utils.js             # Date helpers, trend data, image compression
│   ├── charts.js            # Canvas pie chart + trend chart renderers
│   └── constants.js         # Static data (currencies, colors, icons)
├── components/
│   ├── AuthModal.svelte     # Login/register modal
│   ├── EditModal.svelte     # Edit expense modal (flatpickr)
│   ├── CurrencyModal.svelte # Currency selector
│   ├── FamilyModal.svelte   # Manage family members
│   ├── DeleteAllModal.svelte
│   ├── ImportModal.svelte
│   ├── MobileQuickAdd.svelte
│   ├── AiChatPanel.svelte   # AI assistant slide-in
│   ├── Sidebar.svelte
│   ├── Header.svelte
│   ├── SummaryCards.svelte
│   ├── BudgetOverview.svelte
│   ├── ExpenseForm.svelte   # Add transaction form (flatpickr)
│   ├── ExpenseItem.svelte
│   ├── PieChart.svelte
│   ├── TrendChart.svelte
│   ├── TopCategories.svelte
│   └── LoadingSpinner.svelte
└── views/
    ├── Dashboard.svelte
    ├── IncomeView.svelte
    ├── ExpenseView.svelte
    ├── HistoryView.svelte
    └── AccountView.svelte
```

### State model
`src/lib/state.svelte.js` owns all reactive state using Svelte 5 runes. Views and components import getter/setter functions to read/write state. The `expense[]` array is the single source of truth. Budget goals persist to `localStorage` (`sw_budget_goals`). Currency preferences persist to `localStorage` too.

### Auth & CSRF flow
1. On mount, `App.svelte` calls `fetchCsrfToken()` → `GET /api/auth/csrf` → sets `sw_csrf` cookie + in-memory token.
2. `checkSession()` verifies existing session via `GET /api/auth/me`.
3. Login/register sets a signed JWT in an HttpOnly `sw_session` cookie (7-day expiry).
4. Every `POST/PUT/DELETE` includes `x-csrf-token` via `apiFetch()`.
5. The JWT contains a `tokenVersion` field validated on every request.

### Adding a new feature
1. Add state getters/setters in `src/lib/state.svelte.js` if needed.
2. Add API function in `src/lib/api.js` using `apiFetch()`.
3. Create a component in `src/components/` or view in `src/views/`.
4. Import and use it in `src/App.svelte` or the relevant view.
5. If adding a new API route, create in `server/src/routes/` and register in `server/src/app.ts`.

### Key constraints
- All expense queries on the server filter by `req.userId`.
- State-changing requests must have `Content-Type: application/json`.
- The frontend uses DOM methods (`textContent`) for user-supplied data to prevent XSS.
- Tailwind v4 is configured via `@import "tailwindcss"` in `src/app.css` — no config file needed.
- Flatpickr is used for date inputs and loaded from npm (not CDN at build time).
