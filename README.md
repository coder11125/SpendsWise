# SpendsWise

A budget tracker with a static frontend and a TypeScript + Express + MongoDB backend, deployed on Vercel.

## Project layout

```
SpendsWise/
├── index.html          # frontend entry
├── auth.js             # auth page logic
├── script.js           # main frontend logic
├── styles.css          # base styles
├── src/
│   └── input.css       # Tailwind source
├── dist/
│   └── output.css      # compiled Tailwind output
├── images/
│   └── wallet.svg
├── package.json        # root — Tailwind build scripts
├── vercel.json         # Vercel deployment config
└── server/             # Node.js + TypeScript API
    ├── src/
    │   ├── app.ts              # Express app (Vercel entry)
    │   ├── index.ts            # local dev entry
    │   ├── config.ts           # env loader
    │   ├── db.ts               # Mongoose connection
    │   ├── models/             # User, Expense
    │   ├── middleware/         # auth, asyncHandler, csrf
    │   ├── routes/             # auth, expenses
    │   └── types/
    │       └── express.d.ts    # Request.userId augmentation
    ├── .env.example
    ├── package.json
    └── tsconfig.json
```

## Frontend

Static pages using Tailwind CSS (compiled locally), Phosphor icons, and Flatpickr.

### Build CSS

```bash
npm install
npm run build:css     # compile once
npm run watch:css     # watch mode
```

Serve the frontend with any static server:

```bash
npx serve .
```

## Backend

Node.js + TypeScript API with JWT authentication and MongoDB via Mongoose.

### Prerequisites

- Node.js 18+
- A MongoDB instance (local or [MongoDB Atlas](https://www.mongodb.com/atlas))

### Setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env`:

```
PORT=4000
MONGODB_URI=mongodb://localhost:27017/spendswise
JWT_SECRET=<long random string>
CSRF_SECRET=<different long random string>
```

Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

### Run locally

```bash
npm run dev      # ts-node-dev with auto-reload
npm run build    # compile to dist/
npm start        # run compiled build
```

Health check: `GET http://localhost:4000/health`

### API

Session is managed via an HttpOnly cookie (`sw_session`). All state-changing requests must include a valid CSRF token in the `x-csrf-token` header — fetch one from `GET /api/auth/csrf` before making any writes.

| Method | Path                  | Auth | Body                                                                 |
|--------|-----------------------|------|----------------------------------------------------------------------|
| GET    | `/api/auth/csrf`      | no   | — Returns `{ token }` and sets the `sw_csrf` cookie                 |
| POST   | `/api/auth/register`  | no   | `{ email, password }` (password: 12–72 chars, mixed complexity)     |
| POST   | `/api/auth/login`     | no   | `{ email, password }`                                                |
| POST   | `/api/auth/logout`    | no   | —                                                                    |
| GET    | `/api/auth/me`        | yes  | —                                                                    |
| PUT    | `/api/auth/password`  | yes  | `{ currentPassword, newPassword }`                                   |
| GET    | `/api/family-members` | yes  | — Returns `{ familyMembers }`                                        |
| POST   | `/api/family-members` | yes  | `{ name }`                                                           |
| DELETE | `/api/family-members` | yes  | `{ name }`                                                           |
| GET    | `/api/expenses`       | yes  | —                                                                    |
| POST   | `/api/expenses`       | yes  | `{ amount, category, type, note?, date?, currency?, familyMember? }` |
| PUT    | `/api/expenses/:id`   | yes  | any subset of the above fields                                       |
| DELETE | `/api/expenses/:id`   | yes  | —                                                                    |

### Data model

**User**: `email` (unique), `passwordHash`, `familyMembers[]`, `tokenVersion`, timestamps.

**Expense**: `userId` (ref User), `type` (`income` | `expense`), `amount` (>= 0), `category`, `note`, `date`, `currency`, `familyMember`, timestamps.

### Auth flow

1. On page load the frontend fetches `GET /api/auth/csrf` to obtain a CSRF token and set the `sw_csrf` cookie.
2. Register or login sets a signed JWT in an HttpOnly, SameSite=Strict cookie (`sw_session`, 7-day expiry).
3. The JWT embeds a `tokenVersion` (`tv`) field that is verified against the database on every authenticated request.
4. Changing your password increments `tokenVersion` in the database, immediately invalidating all previously issued tokens including any that may have been stolen.
5. All expense queries filter by `userId` — users cannot read or modify others' data.

## Security

| Control | Detail |
|---------|--------|
| CSRF protection | Double-submit cookie pattern (`csrf-csrf`). `GET /api/auth/csrf` issues a token; all POST/PUT/DELETE requests must send it as `x-csrf-token`. |
| Session cookie | HttpOnly, SameSite=Strict, Secure (production). Cannot be read by JavaScript. |
| Token revocation | `tokenVersion` stored on the User document. Password change increments it, invalidating all live sessions instantly. |
| Rate limiting | Auth endpoints: 10 req / 15 min / IP. Expense endpoints: 200 req / 15 min / IP. Correctly keyed on real client IP via `trust proxy`. |
| Content-Type enforcement | Non-JSON bodies on state-changing requests are rejected with 415. |
| Password rules | 12–72 characters, requires uppercase, lowercase, digit, and special character. bcrypt cost 10. |
| NoSQL injection | `express-mongo-sanitize` strips `$` and `.` operator keys from all request bodies. |
| Security headers | Helmet (HSTS, X-Content-Type-Options, etc.) on every API response. |

## Deployment (Vercel)

The project deploys as a monorepo on Vercel:

- **Frontend** — static files (`index.html`, `auth.js`, `script.js`, `dist/output.css`, `images/`) served directly.
- **Backend** — `server/src/app.ts` handled by `@vercel/node`. All `/api/*` and `/health` requests are routed there.

### Required environment variables (set in Vercel dashboard)

| Variable       | Description                                    |
|----------------|------------------------------------------------|
| `MONGODB_URI`  | MongoDB Atlas connection string                |
| `JWT_SECRET`   | Long random string for signing JWTs            |
| `CSRF_SECRET`  | Long random string for signing CSRF tokens (separate from `JWT_SECRET`) |

> **MongoDB Atlas note:** add `0.0.0.0/0` to your Atlas Network Access list so Vercel's dynamic IPs can connect.

## License

MIT
