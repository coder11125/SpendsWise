import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { UserModel } from "../models/User";

interface JwtPayload {
  userId: string;
  tv: number; // C4: token version for server-side revocation
}

export async function authRequired(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.cookies?.sw_session;
  if (!token) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  // Step 1: verify JWT signature and expiry (pure crypto, no DB)
  let payload: JwtPayload;
  try {
    payload = jwt.verify(token, config.jwtSecret, { algorithms: ["HS256"] }) as JwtPayload;
  } catch {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  // C4: Step 2: check tokenVersion against DB so password changes / explicit
  // revocation take effect immediately rather than waiting for JWT expiry.
  try {
    const user = await UserModel.findById(payload.userId).select("tokenVersion").lean();
    // Existing documents pre-dating the tokenVersion field have it as undefined;
    // treat that as 0 so they aren't forced to re-login after the schema change.
    if (!user || (user.tokenVersion ?? 0) !== (payload.tv ?? 0)) {
      res.status(401).json({ error: "Session invalidated — please log in again" });
      return;
    }
  } catch (err) {
    next(err);
    return;
  }

  req.userId = payload.userId;
  next();
}
