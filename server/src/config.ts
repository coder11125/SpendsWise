import dotenv from "dotenv";

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: required("MONGODB_URI"),
  jwtSecret: required("JWT_SECRET"),
  csrfSecret: required("CSRF_SECRET"),
  jwtExpiresIn: "7d" as const,
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "https://spends-wise.vercel.app")
    .split(",")
    .map((o) => o.trim()),
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
};
