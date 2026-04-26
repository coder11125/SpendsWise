import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserModel } from "../models/User";
import { config } from "../config";
import { asyncHandler } from "../middleware/asyncHandler";
import { authRequired } from "../middleware/auth";
import { generateCsrfToken } from "../middleware/csrf";

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
  secure: process.env.NODE_ENV !== "development",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: "/",
};

// C4: embed tokenVersion (tv) in the JWT so authRequired can verify it against
// the DB and immediately detect revoked sessions (e.g. after password change).
function signAndSetCookie(res: Response, userId: string, tokenVersion: number): void {
  const options: SignOptions = { expiresIn: config.jwtExpiresIn };
  const token = jwt.sign({ userId, tv: tokenVersion }, config.jwtSecret, options);
  res.cookie("sw_session", token, COOKIE_OPTS);
}

// C1: Issue a CSRF token. The browser sends it back as x-csrf-token on every
// state-changing request; doubleCsrfProtection validates header vs. cookie.
router.get("/csrf", (req, res) => {
  const token = generateCsrfToken(req, res);
  res.json({ token });
});

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      return res.status(400).json({ error: "Email and password required" });
    }
    const normalizedEmail = email.toLowerCase().trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
      return res.status(400).json({ error: "Invalid email address" });
    }
    const pwErr = validatePassword(password);
    if (pwErr) return res.status(400).json({ error: pwErr });

    const existing = await UserModel.findOne({ email: normalizedEmail });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 12);
    try {
      const user = await UserModel.create({ email: normalizedEmail, passwordHash });
      signAndSetCookie(res, user._id.toString(), user.tokenVersion ?? 0);
      return res.status(201).json({ user: { id: user._id, email: user.email } });
    } catch (err: any) {
      if (err.code === 11000) return res.status(409).json({ error: "Email already registered" });
      throw err;
    }
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

    signAndSetCookie(res, user._id.toString(), user.tokenVersion ?? 0);
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
    const user = await UserModel.findById(req.userId).select("-passwordHash -tokenVersion");
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

    // C4: Increment tokenVersion to invalidate all existing sessions (including
    // any stolen cookies), then re-issue a fresh cookie for the current request.
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;
    user.passwordHash = await bcrypt.hash(newPassword, 12);
    await user.save();

    signAndSetCookie(res, user._id.toString(), user.tokenVersion);
    return res.json({ message: "Password updated successfully" });
  })
);

export default router;
