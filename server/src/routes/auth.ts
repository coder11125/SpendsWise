import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt, { SignOptions } from "jsonwebtoken";
import { UserModel } from "../models/User";
import { config } from "../config";
import { asyncHandler } from "../middleware/asyncHandler";
import { authRequired } from "../middleware/auth";

const router = Router();

function signToken(userId: string): string {
  const options: SignOptions = { expiresIn: config.jwtExpiresIn };
  return jwt.sign({ userId }, config.jwtSecret, options);
}

router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string" || password.length < 6) {
      return res.status(400).json({ error: "Email and password (min 6 chars) required" });
    }

    const existing = await UserModel.findOne({ email: email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await UserModel.create({ email, passwordHash });
    const token = signToken(user._id.toString());
    return res.status(201).json({ token, user: { id: user._id, email: user.email } });
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

    const token = signToken(user._id.toString());
    return res.json({ token, user: { id: user._id, email: user.email } });
  })
);

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
    if (typeof currentPassword !== "string" || typeof newPassword !== "string" || newPassword.length < 6) {
      return res.status(400).json({ error: "currentPassword and newPassword (min 6 chars) are required" });
    }

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
