import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserModel } from "../models/User";
import { config } from "../config";
import { asyncHandler } from "../middleware/asyncHandler";
import { authRequired } from "../middleware/auth";

const router = Router();

// H1: Minimum 12 chars, requires upper, lower, digit, and special character.
// H2: Hard cap at 72 bytes — bcrypt silently truncates beyond this boundary.
const PASSWORD_RULES =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]).{12,72}$/;

function validatePassword(password: string): string | null {
  if (password.length > 72) return "Password must be 72 characters or fewer";
  if (!PASSWORD_RULES.test(password))
    return "Password must be 12–72 characters and include uppercase, lowercase, a number, and a special character";
  return null;
}

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: "/",
};

function signAndSetCookie(res: Response, userId: string): void {
  const options: SignOptions = { expiresIn: config.jwtExpiresIn };
  const token = jwt.sign({ userId }, config.jwtSecret, options);
  res.cookie("sw_session", token, COOKIE_OPTS);
}

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password required" });
    }
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ email, passwordHash });
    signAndSetCookie(res, user._id.toString());
    return res.status(201).json({ user: { id: user._id, email: user.email } });
  })
);

router.post(
  "/login",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password required" });
    }

    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    signAndSetCookie(res, user._id.toString());
    return res.json({ user: { id: user._id, email: user.email } });
  })
);

router.post("/logout", (_req, res) => {
  res.clearCookie("sw_session", { path: "/" });
  res.json({ message: "Logged out" });
});

router.get(
  "/me",
  authRequired,
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.userId).select("-passwordHash");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ id: user._id, email: user.email, createdAt: user.createdAt });
  })
);

router.put(
  "/password",
  authRequired,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body ?? {};
    if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
      return res.status(400).json({ error: "currentPassword and newPassword are required" });
    }
    const pwErr = validatePassword(newPassword);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const user = await UserModel.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const ok = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Current password is incorrect" });

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();
    return res.json({ message: "Password updated successfully" });
  })
);

export default router;
