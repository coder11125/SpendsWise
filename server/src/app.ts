import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import mongoSanitize from "express-mongo-sanitize";
import { connectDB } from "./db";
import authRoutes from "./routes/auth";
import expenseRoutes from "./routes/expenses";
import { config } from "./config";
import { doubleCsrfProtection, invalidCsrfTokenError } from "./middleware/csrf";

const app = express();

// C2: Tell Express to trust Vercel's reverse proxy so req.ip is the real client IP
// and express-rate-limit uses the correct IP instead of the proxy's shared IP.
app.set("trust proxy", 1);

app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || config.allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`[CORS] Rejected origin: ${origin}`);
        callback(null, false);
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    // x-csrf-token must be in allowedHeaders for browsers to send it cross-origin
    allowedHeaders: ["Content-Type", "x-csrf-token"],
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: "10kb" }));
app.use(mongoSanitize());

// C1: Reject state-changing requests that are not application/json.
// This closes the <form enctype="text/plain"> CSRF bypass vector.
app.use((req, res, next) => {
  if (
    ["POST", "PUT", "DELETE", "PATCH"].includes(req.method) &&
    !req.is("application/json")
  ) {
    res.status(415).json({ error: "Content-Type must be application/json" });
    return;
  }
  next();
});

// C4: Rate-limit auth endpoints — 10 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." },
});

// C3: Rate-limit expense endpoints — 200 requests per 15 min per IP
const expenseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});

// Cache the DB connection promise so serverless warm starts don't reconnect
let dbPromise: Promise<void> | null = null;
app.use((_req, _res, next) => {
  if (!dbPromise) dbPromise = connectDB();
  dbPromise.then(() => next()).catch(next);
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// C1: Apply CSRF protection to all state-changing routes.
// GET /api/auth/csrf is exempt because CSRF middleware ignores GET requests.
app.use(doubleCsrfProtection);

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/expenses", expenseLimiter, expenseRoutes);

// C1: Handle CSRF validation failures with a clear 403 before the generic handler
app.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  if (err === invalidCsrfTokenError) {
    res.status(403).json({ error: "Invalid CSRF token" });
    return;
  }
  next(err);
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack ?? err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
