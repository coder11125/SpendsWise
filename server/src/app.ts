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

const app = express();

// C6: Security headers
app.use(helmet());

// C5: Explicit origin allow-list (set ALLOWED_ORIGINS env var, comma-separated)
app.use(
  cors({
    origin: config.allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  })
);

// C3: Parse HttpOnly session cookies
app.use(cookieParser());

// H8: Tighten body size limit
app.use(express.json({ limit: "10kb" }));

// H3: Strip MongoDB operator keys ($, .) from all request bodies and query strings
app.use(mongoSanitize());

// C4: Rate-limit auth endpoints — 10 attempts per 15 min per IP
// Note: in-memory store is per-serverless-instance; add an Upstash/Redis store
// if you need cross-instance enforcement.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." },
});

// Cache the DB connection promise so serverless warm starts don't reconnect
let dbPromise: Promise<void> | null = null;
app.use((_req, _res, next) => {
  if (!dbPromise) dbPromise = connectDB();
  dbPromise.then(() => next()).catch(next);
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/expenses", expenseRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.name, err.message);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
