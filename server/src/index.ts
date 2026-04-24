import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { config } from "./config";
import { connectDB } from "./db";
import authRoutes from "./routes/auth";
import expenseRoutes from "./routes/expenses";
import "./types/express";

async function main(): Promise<void> {
  await connectDB();

  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api/auth", authRoutes);
  app.use("/api/expenses", expenseRoutes);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  });

  app.listen(config.port, () => {
    console.log(`Server listening on http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
