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
- The frontend is a Svelte 5 SPA built with Vite. Entry point is `index.html` → `src/app.ts` → `src/App.svelte`.
- State is managed with Svelte 5 runes (`$state`, `$derived`) in `src/lib/state.svelte.ts` — a shared reactive module.
- All API calls go through `apiFetch()` in `src/lib/api.ts`, which automatically attaches credentials and CSRF header.
- Shared types live in `src/types.ts` (Expense, Recurrence, Profile, CurrencyRates, Summary, CategoryData, TrendData, etc.).
- The backend lives in `server/src/` and compiles to `server/dist/`. On Vercel, `api/index.ts` is the serverless entry (re-exports the Express app); `server/src/index.ts` is the local dev entry.
- Vite dev server proxies `/api` → `localhost:4000` automatically.

### Frontend architecture
```
src/
├── types.ts                    # Shared TypeScript interfaces (Expense, Recurrence, etc.)
├── app.ts                      # Client entry point
├── App.svelte                  # Root component — router, modals, layout
├── app.css                     # Tailwind v4 via @import "tailwindcss"
├── lib/
│   ├── state.svelte.ts         # Reactive state (runes-based getters/setters)
│   ├── api.ts                  # API wrapper + all endpoint functions
│   ├── currency.ts             # Currency formatting/conversion + live rate fetching
│   ├── calculations.svelte.ts  # Async summary calculations (income, expense, category)
│   ├── utils.ts                # Date helpers, trend data, image compression
│   ├── charts.ts               # Canvas pie chart + trend chart renderers
│   └── constants.ts            # Static data (currencies, colors, categoryIcons)
├── components/
│   ├── AiChatPanel.svelte      # AI assistant slide-in panel (Groq-powered chat)
│   ├── AuthModal.svelte        # Login/register modal
│   ├── BudgetOverview.svelte   # Per-category budget goal progress bars
│   ├── BulkImportModal.svelte  # Receipt bulk import review/save modal
│   ├── CurrencyModal.svelte    # Currency selector with live rates
│   ├── DeleteAllModal.svelte   # Confirm delete-all-transactions
│   ├── EditModal.svelte        # Edit expense modal (flatpickr + recurrence toggle)
│   ├── ExpenseForm.svelte      # Add transaction form (flatpickr, AI quick-add, receipt OCR, recurrence)
│   ├── ExpenseItem.svelte      # Single expense/income row (recurrence badge, currency conversion)
│   ├── FamilyModal.svelte      # Manage family members
│   ├── Header.svelte           # Top bar — currency switcher, people button
│   ├── ImportModal.svelte      # Import result feedback modal
│   ├── LoadingSpinner.svelte   # Loading indicator
│   ├── MobileQuickAdd.svelte   # Quick-add FAB modal (mobile)
│   ├── PieChart.svelte         # Category pie chart
│   ├── RecurringUpcoming.svelte # Dashboard card — active/paused recurring transactions
│   ├── Sidebar.svelte          # Left navigation (Dashboard, Income, Expense, Account)
│   ├── SummaryCards.svelte     # Income/expense/balance summary cards
│   ├── TopCategories.svelte    # Top expense categories list
│   └── TrendChart.svelte       # Expense trend line chart
└── views/
    ├── Dashboard.svelte        # Main dashboard (summary, form, charts, recurring, recent)
    ├── IncomeView.svelte       # Income list with search/sort
    ├── ExpenseView.svelte      # Expense list with search/sort, pie chart, trend
    └── AccountView.svelte      # Profile, stats, import/export, dark mode, password, budget goals, danger zone
```

### Backend architecture
```
server/src/
├── app.ts                      # Express app setup — middleware, routes, recurring scheduler
├── index.ts                    # Local dev server entry (listens on PORT)
├── config.ts                   # Environment variable loading (MongoDB, JWT, CSRF, Groq, Pusher, Google)
├── db.ts                       # MongoDB connection with reconnect logic
├── lib/
│   ├── pusher.ts               # Pusher real-time notifications (data-changed events)
│   └── recurringScheduler.ts   # 60s interval scheduler — auto-generates recurring transactions
├── middleware/
│   ├── auth.ts                 # JWT auth middleware (req.userId)
│   ├── asyncHandler.ts         # Express async error wrapper
│   ├── csrf.ts                 # CSRF double-submit cookie protection
│   ├── groqRateLimiter.ts      # Burst, sliding window, and concurrency limiters for Groq
│   └── passport.ts             # Passport local + Google OAuth strategies
├── models/
│   ├── Expense.ts              # Mongoose schema — type, amount, category, date, currency, familyMember, note, recurrence
│   └── User.ts                 # Mongoose schema — email, passwordHash, familyMembers, aiUsage, tokenVersion
├── routes/
│   ├── auth.ts                 # POST /login, /register, /logout, GET /me, /csrf, PUT /password, Google OAuth
│   ├── expenses.ts             # CRUD /expenses, GET /recurring, PUT /:id/recurring, POST /bulk, DELETE all
│   ├── familyMembers.ts        # GET/POST/DELETE /family-members
│   ├── ai.ts                   # POST /chat, /parse, /parse-receipt, /parse-receipts-bulk, GET /quota
│   └── currency.ts             # GET /rates (proxies exchangerate-api)
└── types/
    ├── express.d.ts            # Express Request augmentation (userId)
    └── pusher.d.ts             # Pusher type declarations
```

### Data model

#### Expense (Mongoose)
```
{
  userId: ObjectId (ref: User, indexed),
  type: "income" | "expense",
  amount: Number (0–1e12),
  category: String,
  currency: String (default "USD"),
  familyMember: String,
  note: String,
  date: Date,
  recurrence: {                    // null for non-recurring
    frequency: "daily" | "weekly" | "biweekly" | "monthly" | "yearly",
    nextDueDate: Date,
    endDate: Date | null,
    isActive: Boolean
  },
  timestamps: true                 // createdAt, updatedAt
}
```
- Generated recurring entries are plain expenses (no `recurrence` field) — only the template has it.
- The recurring scheduler (`server/src/lib/recurringScheduler.ts`) runs every 60s, creates entries from due templates, advances `nextDueDate`, and deactivates on `endDate`.

#### User (Mongoose)
```
{
  email: String (unique, lowercase),
  passwordHash: String,
  familyMembers: [String],
  aiUsage: { dailyCount, monthlyCount, dailyDate, monthlyDate, count },
  tokenVersion: Number,
  googleId: String (optional),
  timestamps: true
}
```

### State model
`src/lib/state.svelte.ts` owns all reactive state using Svelte 5 runes. Views and components import getter/setter functions to read/write state. The `expense[]` array is the single source of truth. Budget goals persist to `localStorage` (`sw_budget_goals`). Currency preferences persist to `localStorage` too. AI chat history is held in memory per session.

Key state:
- `_expense` — all transactions (income + expense), synced from server via Pusher + polling
- `_currentCurrency` — active display currency (persisted to localStorage)
- `_budgetGoals` — per-category spending limits (persisted to localStorage)
- `_familyMembers` — household member names for per-transaction tagging
- `_aiChatHistory` — AI conversation messages (in-memory only)
- `_currentView` — current route view (dashboard | income | expense | account)

### Auth & CSRF flow
1. On mount, `App.svelte` calls `fetchCsrfToken()` → `GET /api/auth/csrf` → sets `sw_csrf` cookie + in-memory token.
2. `checkSession()` verifies existing session via `GET /api/auth/me`.
3. Login/register sets a signed JWT in an HttpOnly `sw_session` cookie (7-day expiry).
4. Every `POST/PUT/DELETE` includes `x-csrf-token` via `apiFetch()`.
5. The JWT contains a `tokenVersion` field validated on every request.

### API endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/auth/register` | Register new account |
| POST | `/api/auth/login` | Login (email/password) |
| POST | `/api/auth/logout` | Logout (clear session) |
| GET | `/api/auth/me` | Get current user profile |
| GET | `/api/auth/csrf` | Get CSRF token |
| PUT | `/api/auth/password` | Change password |
| GET | `/api/expenses` | List all expenses (sorted by date desc) |
| POST | `/api/expenses` | Create expense (with optional `recurrence`) |
| PUT | `/api/expenses/:id` | Update expense fields |
| DELETE | `/api/expenses/:id` | Delete single expense |
| DELETE | `/api/expenses` | Delete all expenses (requires `confirm: true`) |
| GET | `/api/expenses/recurring` | List active recurring templates |
| PUT | `/api/expenses/:id/recurring` | Update recurrence (frequency, endDate, isActive, nextDueDate) |
| POST | `/api/expenses/bulk` | Bulk create from CSV rows (max 500) |
| GET | `/api/auth/google` | Start Google OAuth flow |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| GET | `/api/family-members` | List family members |
| POST | `/api/family-members` | Add family member |
| DELETE | `/api/family-members` | Remove family member |
| GET | `/api/currency/rates?base=` | Get currency conversion rates |
| GET | `/api/ai/quota` | Get AI usage quota (daily/monthly remaining) |
| POST | `/api/ai/chat` | AI chat assistant |
| POST | `/api/ai/parse-receipt` | AI receipt OCR (single) |
| POST | `/api/ai/parse-receipts-bulk` | AI receipt OCR (batch, max 10) |

### Features summary
- **Transactions**: Add/edit/delete income and expense entries with category, date, currency, family member, notes
- **Recurring transactions**: Templates with daily/weekly/biweekly/monthly/yearly frequency, auto-generated by server scheduler
- **Dashboard**: Summary cards, pie chart, trend chart, budget overview, recurring transactions, recent entries
- **AI assistant**: Chat with your financial data, receipt OCR (single + bulk, with an optional higher-accuracy "OCR Pro" mode)
- **Budget goals**: Per-category spending targets with progress tracking
- **Multi-currency**: Live exchange rates, per-transaction currency, unified display currency
- **Family members**: Tag transactions by household member
- **Import/Export**: CSV import (with AI bulk receipt import), CSV export
- **Dark mode**: System-aware toggle with localStorage persistence
- **Real-time sync**: Pusher WebSocket events + 5-min polling fallback
- **Mobile**: Responsive layout with FAB quick-add button

### Adding a new feature
1. Add TypeScript interfaces in `src/types.ts` if needed.
2. Add state getters/setters in `src/lib/state.svelte.ts` if needed.
3. Add API function in `src/lib/api.ts` using `apiFetch()`.
4. Create a component in `src/components/` or view in `src/views/`.
5. Import and use it in `src/App.svelte` or the relevant view.
6. If adding a new API route, create in `server/src/routes/` and register in `server/src/app.ts`.

### Key constraints
- All expense queries on the server filter by `req.userId`.
- State-changing requests must have `Content-Type: application/json`.
- The frontend uses DOM methods (`textContent`) for user-supplied data to prevent XSS.
- Tailwind v4 is configured via `@import "tailwindcss"` in `src/app.css` — no config file needed.
- Flatpickr is used for date inputs and loaded from npm (not CDN at build time).
- Recurring templates are the expense document itself; generated instances are separate plain expenses (no `recurrence` field).
- AI endpoints are rate-limited per user (burst + sliding window) and per API key (Groq concurrency slots).
- bcrypt cost factor is 12.
- Bulk import is capped at 500 rows with per-row validation.
- All `:id` expense route params are guarded with `ObjectId.isValid()` before DB access.
- `PUSHER_*` env vars enable real-time sync; omitting them falls back to 5-min polling only.
