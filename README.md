# SpendsWise - Global Budget Tracker

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
    │   ├── middleware/         # auth, asyncHandler
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
JWT_SECRET=replace-with-a-long-random-string
```

### Run locally

```bash
npm run dev      # ts-node-dev with auto-reload
npm run build    # compile to dist/
npm start        # run compiled build
```

Health check: `GET http://localhost:4000/health`

### API

All expense routes require `Authorization: Bearer <token>`.

| Method | Path                  | Auth | Body                                             |
|--------|-----------------------|------|--------------------------------------------------|
| POST   | `/api/auth/register`  | no   | `{ email, password }` (password min 6 chars)     |
| POST   | `/api/auth/login`     | no   | `{ email, password }`                            |
| GET    | `/api/expenses`       | yes  | —                                                |
| POST   | `/api/expenses`       | yes  | `{ amount, category, note?, date? }`             |
| PUT    | `/api/expenses/:id`   | yes  | any subset of `{ amount, category, note, date }` |
| DELETE | `/api/expenses/:id`   | yes  | —                                                |

Auth endpoints return `{ token, user: { id, email } }`.

### Data model

**User**: `email` (unique), `passwordHash`, timestamps.

**Expense**: `userId` (ref User), `amount` (>= 0), `category`, `note`, `date`, timestamps.

### Auth flow

1. Register or login returns a signed JWT (7-day expiry).
2. Client sends `Authorization: Bearer <token>` on protected requests.
3. The `authRequired` middleware verifies the token and sets `req.userId`.
4. All expense queries filter by `userId` — users cannot read or modify others' data.

## Deployment (Vercel)

The project deploys as a monorepo on Vercel:

- **Frontend** — static files (`index.html`, `auth.js`, `script.js`, `dist/output.css`, `images/`) served directly.
- **Backend** — `server/src/app.ts` handled by `@vercel/node`. All `/api/*` and `/health` requests are routed there.

### Required environment variables (set in Vercel dashboard)

| Variable       | Description                          |
|----------------|--------------------------------------|
| `MONGODB_URI`  | MongoDB Atlas connection string      |
| `JWT_SECRET`   | Long random string for signing JWTs  |

> **MongoDB Atlas note:** add `0.0.0.0/0` to your Atlas Network Access list so Vercel's dynamic IPs can connect.

## License

MIT
