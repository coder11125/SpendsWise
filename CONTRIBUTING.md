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
├── index.html              # Main app (single-page)
├── auth.js                 # Auth page logic
├── script.js               # App logic (expenses, views, charts)
├── styles.css              # Base styles
├── CLAUDE.md               # Claude Code instructions
├── src/
│   └── input.css           # Tailwind source — edit this, not dist/
├── dist/
│   └── output.css          # Compiled CSS (do not edit manually)
├── images/
│   └── wallet.svg
├── package.json            # Root — Tailwind build scripts
├── vercel.json             # Vercel deployment config
└── server/                 # Express + TypeScript API
    ├── src/
    │   ├── app.ts          # Express app (Vercel entry)
    │   ├── index.ts        # Local dev entry
    │   ├── config.ts       # Env loader
    │   ├── db.ts           # Mongoose connection
    │   ├── models/
    │   │   ├── User.ts     # User schema & model
    │   │   └── Expense.ts  # Expense schema & model
    │   ├── middleware/
    │   │   ├── auth.ts     # JWT verification, sets req.userId
    │   │   ├── asyncHandler.ts  # Wraps async route handlers
    │   │   └── csrf.ts     # Double-submit CSRF protection
    │   ├── routes/
    │   │   ├── auth.ts     # Register, login, logout, me, password
    │   │   ├── expenses.ts # CRUD + bulk import for expenses
    │   │   └── familyMembers.ts # Add / list / delete members
    │   └── types/
    │       └── express.d.ts  # Request.userId augmentation
    ├── .env.example
    ├── package.json
    └── tsconfig.json
```

---

## Local Setup

### Prerequisites

- Node.js 18+
- MongoDB running locally (or a MongoDB Atlas connection string)

### 1. Clone and install

```bash
git clone <repo-url>
cd SpendsWise

# Root (Tailwind tooling)
npm install

# Server
cd server && npm install
```

### 2. Configure environment

```bash
cp server/.env.example server/.env
```

Edit `server/.env`:

```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/spendswise
JWT_SECRET=<long-random-string>
CSRF_SECRET=<different-long-random-string>
```

### 3. Start the server

```bash
cd server
npm run dev        # ts-node-dev with hot reload
```

The API runs at `http://localhost:4000`.

### 4. Build the CSS

In a separate terminal from the project root:

```bash
npm run watch:css  # rebuilds on every src/input.css change
```

Open `index.html` directly in a browser, or serve the root directory with any static file server.

---

## Development Workflow

| Task | Command |
|---|---|
| Start API (hot reload) | `cd server && npm run dev` |
| Watch & rebuild CSS | `npm run watch:css` |
| Build CSS (one-off) | `npm run build:css` |
| Compile server TypeScript | `cd server && npm run build` |

### CSS changes

- Edit **`src/input.css`** only — never edit `dist/output.css` directly.
- Dark mode uses Tailwind's `class` strategy. The `dark` class is toggled on `<html>` by `toggleDarkMode()` in `script.js` and persisted in `localStorage`. An inline `<script>` in `<head>` applies the class before CSS renders to prevent flash.
- All dark mode overrides live at the bottom of `src/input.css` under the `/* ── Dark Mode ── */` block. Add new overrides there — do not scatter `dark:` utilities across the HTML.
- `build:css` compiles without `--minify`, so `dist/output.css` is human-readable.
- After editing, run `npm run build:css` (or keep `watch:css` running).
- Commit `dist/output.css` alongside your CSS changes.

### Server changes

- Source lives in `server/src/`. TypeScript is compiled to `server/dist/`.
- Run `cd server && npm run build` before testing the compiled output.
- `server/dist/` is git-ignored; Vercel compiles from source on deploy.

---

## Code Conventions

### General

- Vanilla JS for the frontend — no framework, no bundler.
- All user-facing strings must be HTML-escaped before insertion into the DOM. Use `buildItemRow()` as the reference pattern, not `innerHTML` with raw data.
- Keep functions focused. Prefer adding a new function over extending an existing one beyond its original purpose.
- **Client-only state** (user preferences, UI settings) belongs in `localStorage`. Budget goals (`sw_budget_goals`) are an example — they are not synced to the server.
- **Edit flows** follow the pattern in `openEditModal` / `saveEditExpense`: pre-populate a modal from the in-memory item, call the API on submit, patch the `expense[]` array in place, then call the relevant render functions for the current view.

### Server (TypeScript)

- All route handlers go through `asyncHandler` — do not use try/catch in route callbacks directly.
- Validate every field at the route level before touching the database. Mirror the validation that already exists in `POST /expenses`.
- Use `req.userId` (set by `authRequired` middleware) — never trust a userId from the request body.

### Tailwind / CSS

- Use existing utility classes before adding custom CSS.
- New dark-mode overrides go in the `.dark` block at the bottom of `src/input.css`.
- Do not add inline `style=""` attributes for colors or spacing — use utilities.

### Security

- Never log or return `passwordHash`, `tokenVersion`, or JWT secrets.
- Any new endpoint that mutates data must be behind `authRequired`.
- Sanitize and cap string lengths on both client and server, matching the limits already set in the Mongoose schemas.

---

## Submitting Changes

1. Fork the repository and create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes, then build and verify:
   ```bash
   npm run build:css          # root
   cd server && npm run build # server
   ```

3. Commit `dist/output.css` if you changed any CSS or Tailwind config.

4. Open a pull request against `main` with a clear description of what changed and why.

---

For questions, open a GitHub issue.
