# SpendsWise

A budget tracker with a static frontend and a TypeScript + Express + MongoDB backend.

## Project layout

```
SpendsWise/
├── index.html          # frontend entry
├── script.js           # frontend logic
├── styles.css          # frontend styles
└── server/             # Node.js + TypeScript API
    ├── src/
    │   ├── index.ts            # app entry
    │   ├── config.ts           # env loader
    │   ├── db.ts               # mongoose connection
    │   ├── models/             # User, Expense
    │   ├── middleware/         # auth, asyncHandler
    │   ├── routes/             # auth, expenses
    │   └── types/express.d.ts  # Request.userId augmentation
    ├── package.json
    └── tsconfig.json
```

## Frontend

The frontend is a static page using Tailwind (via CDN), Phosphor icons, and Flatpickr. Open `index.html` directly or serve it with any static server:

```bash
npx serve .
```

## Backend

Node.js + TypeScript API with JWT authentication and MongoDB via Mongoose.

### Prerequisites

- Node.js 18+
- A MongoDB instance (local or hosted, e.g. MongoDB Atlas)

### Setup

```bash
cd server
npm install
cp .env.example .env
```

Edit `.env`:

```
PORT=4000
MONGO_URI=mongodb://localhost:27017/spendswise
JWT_SECRET=replace-with-a-long-random-string
```

### Run

```bash
npm run dev      # ts-node-dev with auto-reload
npm run build    # compile to dist/
npm start        # run compiled build
```

Health check: `GET http://localhost:4000/health`.

### API

All expense routes require `Authorization: Bearer <token>`.

| Method | Path                      | Auth | Body                                           |
|--------|---------------------------|------|------------------------------------------------|
| POST   | `/api/auth/register`      | no   | `{ email, password }` (password min 6 chars)   |
| POST   | `/api/auth/login`         | no   | `{ email, password }`                          |
| GET    | `/api/expenses`           | yes  | —                                              |
| POST   | `/api/expenses`           | yes  | `{ amount, category, note?, date? }`           |
| PUT    | `/api/expenses/:id`       | yes  | any subset of `{ amount, category, note, date }` |
| DELETE | `/api/expenses/:id`       | yes  | —                                              |

Auth endpoints return `{ token, user: { id, email } }`.

### Data model

**User**: `email` (unique), `passwordHash`, timestamps.

**Expense**: `userId` (ref User), `amount` (>= 0), `category`, `note`, `date`, timestamps.

### Auth flow

1. Register or login returns a signed JWT (7-day expiry).
2. Client sends `Authorization: Bearer <token>` on protected requests.
3. The `authRequired` middleware verifies the token and sets `req.userId`.
4. All expense queries filter by `userId` — users cannot read or modify others' data.

## License

MIT
