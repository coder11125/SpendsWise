import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`ERROR: Missing required environment variable: ${name}`);
    return "";
  }
  return value;
}

function getAllowedOrigins(): string[] {
  const origins = (process.env.ALLOWED_ORIGINS ?? "https://spends-wise.vercel.app")
    .split(",")
    .map((o) => o.trim());
  if (process.env.VERCEL_URL) {
    origins.push(`https://${process.env.VERCEL_URL}`);
  }
  if (process.env.VERCEL_BRANCH_URL) {
    origins.push(`https://${process.env.VERCEL_BRANCH_URL}`);
  }
  return origins;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  csrfSecret: required("CSRF_SECRET"),
  jwtExpiresIn: "7d" as const,
  allowedOrigins: getAllowedOrigins(),
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleCallbackUrl: process.env.GOOGLE_CALLBACK_URL ?? "http://localhost:5173/api/auth/google/callback",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqVisionApiKey: process.env.GROQ_VISION_API_KEY ?? "",
  pusherAppId: process.env.PUSHER_APP_ID ?? "",
  pusherKey: process.env.PUSHER_KEY ?? "",
  pusherSecret: process.env.PUSHER_SECRET ?? "",
  pusherCluster: process.env.PUSHER_CLUSTER ?? "ap1",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
  groqVisionModel: process.env.GROQ_VISION_MODEL ?? "meta-llama/llama-4-scout-17b-16e-instruct",
  aiDailyLimit: Number(process.env.AI_DAILY_LIMIT ?? 50),
  aiMonthlyLimit: Number(process.env.AI_MONTHLY_LIMIT ?? 500),
};
