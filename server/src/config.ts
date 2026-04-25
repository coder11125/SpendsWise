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
  jwtExpiresIn: "7d" as const,
  // Comma-separated list of allowed origins. Set ALLOWED_ORIGINS in your env.
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? "https://spends-wise.vercel.app")
    .split(",")
    .map((o) => o.trim()),
};
