# Contributing to SpendsWise

Thank you for your interest in contributing! This document covers how to get the project running locally and the conventions to follow when submitting changes.

---

## Table of Contents

- [Project Structure](#project-structure)
- [Local Setup](#local-setup)
- [Development Workflow](#development-workflow)
- [Code Conventions](#code-conventions)
- [Submitting Changes](#submitting-changes)

---

## Project Structure

```
SpendsWise/
├── index.html                  # Vite frontend entry
├── CLAUDE.md                   # Claude Code instructions
├── src/                        # Svelte 5 SPA (Vite + Tailwind v4)
│   ├── app.ts                  # Client entry point
│   ├── App.svelte              # Root component — router, modals, layout
│   ├── app.css                 # Tailwind v4 via @import "tailwindcss"
│   ├── types.ts                # Shared TypeScript interfaces
│   ├── lib/
│   │   ├── state.svelte.ts     # Reactive state (Svelte 5 runes)
│   │   ├── api.ts              # API wrapper + all endpoint functions
│   │   ├── currency.ts         # Currency formatting/conversion + live rates
│   │   ├── calculations.svelte.ts
│   │   ├── utils.ts
│   │   ├── charts.ts
│   │   └── constants.ts
│   ├── components/              # Modals, forms, cards, charts
│   └── views/                   # Dashboard, IncomeView, ExpenseView, AccountView, SpacesView, SummariesView
├── api/
│   └── index.ts                 # Vercel serverless entry (re-exports the Express app)
├── server/                      # Express + TypeScript API
│   ├── src/
│   │   ├── app.ts               # Express app setup
│   │   ├── index.ts             # Local dev entry
│   │   ├── config.ts            # Env loader
│   │   ├── db.ts                # Mongoose connection (main database)
│   │   ├── models/
│   │   │   ├── User.ts
│   │   │   ├── Expense.ts
│   │   │   ├── Space.ts         # Hub metadata (main database)
│   │   │   ├── SpaceExpense.ts  # Schema compiled per-Hub, in that Hub's own database
│   │   │   └── Summary.ts
│   │   ├── lib/
│   │   │   ├── pusher.ts
│   │   │   ├── recurringScheduler.ts
│   │   │   ├── spaceDb.ts       # Per-Hub database/model resolution via useDb()
│   │   │   ├── expenseHandlers.ts  # Shared CRUD logic for personal + Hub ledgers
│   │   │   └── timezone.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts          # JWT verification, sets req.userId
│   │   │   ├── spaceScope.ts    # Verifies active Hub membership, resolves req.spaceExpenseModel
│   │   │   ├── asyncHandler.ts
│   │   │   ├── csrf.ts
│   │   │   ├── passport.ts
│   │   │   └── groqRateLimiter.ts
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── expenses.ts
│   │   │   ├── spaces.ts        # Hub CRUD, members, invites
│   │   │   ├── spaceExpenses.ts # Mounted at /api/spaces/:spaceId/expenses
│   │   │   ├── currency.ts
│   │   │   ├── summaries.ts
│   │   │   └── ai.ts
│   │   └── types/
│   │       └── express.d.ts     # Request.userId augmentation
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── vercel.json
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB running locally, or a MongoDB Atlas connection string. The database user needs write access to **any** database on the cluster, not just one named database — each Space (Hub) creates its own database on demand.

### 1. Clone and install

```bash
git clone https://github.com/coder11125/SpendsWise.git
cd SpendsWise

# Frontend
npm install

# Server
cd server && npm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

At minimum, fill in `MONGODB_URI`, `JWT_SECRET`, and `CSRF_SECRET` (generate secrets with `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`). Everything else in `server/.env.example` is optional and gated:

- Without `GROQ_API_KEY`, all `/api/ai/*` endpoints return 503 — everything else works normally.
- Without `CURRENCY_API_KEY`, currency conversion silently falls back to 1:1 rates (surfaced to the user as "not live").
- Without `PUSHER_*`, real-time sync falls back to 5-minute polling only.
- Without `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, Google Sign-In is disabled (`/api/auth/google` returns 503).

### 3. Start the server and frontend

```bash
# Terminal 1
cd server && npm run dev     # tsx watch, hot-reloads on change, http://localhost:4000

# Terminal 2 (project root)
npm run dev                  # Vite dev server, http://localhost:5173, proxies /api → :4000
```

---

## Development Workflow

| Task | Command |
|---|---|
| Frontend dev server (HMR) | `npm run dev` |
| Frontend production build | `npm run build` |
| Preview frontend build | `npm run preview` |
| Backend dev server (hot reload) | `cd server && npm run dev` |
| Compile server TypeScript | `cd server && npm run build` |
| Run compiled server | `cd server && npm start` |

### Frontend changes

- Svelte 5 runes (`$state`, `$derived`, `$effect`) — all shared reactive state lives in `src/lib/state.svelte.ts` as plain getter/setter function pairs (e.g. `getExpense()`/`setExpense()`), not exported stores. Follow that pattern for new state.
- Tailwind v4 is configured via `@import "tailwindcss"` in `src/app.css` — there is no `tailwind.config.js` and no separate CSS build step; Vite handles it.
- Dark mode uses Tailwind's `class` strategy — add `dark:` variants alongside the light-mode classes rather than writing separate override blocks.
- Every new API call belongs in `src/lib/api.ts` using the existing `apiFetch()` wrapper (attaches credentials + CSRF header automatically).
- If a call should be scoped to whichever Space/Hub is currently active, follow the pattern in `loadExpenses`/`saveTransaction` — read `getCurrentSpaceId()` and route to `/api/spaces/:id/...` vs `/api/...` accordingly, rather than hardcoding the personal path.
- Use `confirmDialog()` for destructive actions, including logout, Hub deletion, transaction deletion, and bulk deletion. Logout must not clear session state until the user confirms.
- Transaction deletes must treat the server response as authoritative: remove the item from `_expense` only after a successful DELETE response. Preserve the active ledger path and invalidate stale load responses so polling or Pusher cannot restore deleted records.
- Keep the dashboard balance signed. The calculation is `income - expenses`; do not apply absolute-value formatting to the balance card.
- Pending Hub invites belong in the Header Notifications dropdown, not an app-load modal. Keep invite state in `_pendingInvites`, refresh it after authentication, and update it from the user's Pusher channel.

### Server changes

- Source lives in `server/src/`. TypeScript compiles to `server/dist/` (git-ignored; Vercel compiles from source on deploy).
- All route handlers go through `asyncHandler` — do not use try/catch in route callbacks directly.
- Validate every field at the route level before touching the database. Mirror the validation already in `routes/expenses.ts`.
- Use `req.userId` (set by `authRequired`) — never trust a userId from the request body.
- Any route under `/api/spaces/:spaceId/...` must run behind both `authRequired` and `spaceScope` (in that order) — `spaceScope` verifies the requester is an **active** member before attaching `req.spaceExpenseModel`/`req.space`.
- Shared CRUD logic between the personal ledger and Hub ledgers lives in `lib/expenseHandlers.ts` (`createExpenseCrudRouter`) — extend it there rather than duplicating logic across `routes/expenses.ts` and `routes/spaceExpenses.ts`.
- The application-wide Hub limit is three (`MAX_SPACES_GLOBAL` in `server/src/models/Space.ts`). Hub deletion must continue to call `dropDatabase()` for the isolated `space_<id>` database; never migrate Hub transactions into the personal `Expense` collection.
- Invite creation and invite responses should notify the affected user's `user-{id}` Pusher channel so the Notifications dropdown updates in real time.

### AI routes

- All `/api/ai/*` routes are behind `authRequired` — never expose them unauthenticated.
- The chat endpoint fetches the user's recent expense history from MongoDB and passes it as context to Groq, plus tool definitions (`add_transaction`, `edit_transaction`, `delete_transaction`) the model can invoke. Keep tool definitions and the system prompt in `routes/ai.ts`.
- The receipt OCR endpoints accept a base64 `data:image/...` data URL. Images are compressed client-side before upload — don't raise the `2mb`/`10mb` body limits in `app.ts` without a corresponding client-side size guard.
- Model names are read from config (`GROQ_MODEL`, `GROQ_VISION_MODEL`, `GROQ_VISION_PRO_MODEL`) — never hardcode model strings in a route file.
- AI usage is tracked as a single weekly quota (`aiUsage.weeklyCount`/`weekStartDate` on `User`) via `AI_WEEKLY_LIMIT` — there is no separate daily/monthly limit.

### Security

- Never log or return `passwordHash`, `tokenVersion`, or JWT/CSRF secrets.
- Any new endpoint that mutates data must be behind `authRequired` (and `spaceScope` if it's Hub-scoped).
- Sanitize and cap string lengths on both client and server, matching the limits already set in the Mongoose schemas.
- Don't weaken the "Hub as a separate database" boundary — a Space's data must stay reachable only via `req.spaceExpenseModel` resolved by `spaceScope`, never by filtering the main database with a `spaceId` field.

---

## Submitting Changes

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes, then build and verify:
   ```bash
   npm run build              # frontend
   cd server && npm run build # server (tsc)
   ```

3. Open a pull request against `main` with a clear description of what changed and why.

---

For questions, open a GitHub issue.
