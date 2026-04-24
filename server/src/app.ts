import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { connectDB } from "./db";
import authRoutes from "./routes/auth";
import expenseRoutes from "./routes/expenses";
import "./types/express";

const app = express();
app.use(cors());
app.use(express.json());

// Cache the DB connection promise so serverless warm starts don't reconnect
let dbPromise: Promise<void> | null = null;
app.use((_req, _res, next) => {
  if (!dbPromise) dbPromise = connectDB();
  dbPromise.then(() => next()).catch(next);
});

app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/expenses", expenseRoutes);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

export default app;
