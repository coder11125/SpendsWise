import { Router } from "express";
import { authRequired } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { UserModel } from "../models/User";

const router = Router();

router.use(authRequired);

function normalizeMemberName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim();
  if (!name || name.length > 64) return null;
  return name;
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const user = await UserModel.findById(req.userId).select("familyMembers");
    if (!user) return res.status(404).json({ error: "User not found" });
    return res.json({ familyMembers: user.familyMembers ?? [] });
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const name = normalizeMemberName(req.body?.name);
    if (!name) {
      return res.status(400).json({ error: "name is required and must be 64 characters or fewer" });
    }

    const user = await UserModel.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const existing = new Set((user.familyMembers ?? []).map((member) => member.toLocaleLowerCase()));
    if (existing.has(name.toLocaleLowerCase())) {
      return res.status(409).json({ error: "Family member already exists" });
    }

    user.familyMembers = [...(user.familyMembers ?? []), name];
    await user.save();

    return res.status(201).json({ familyMembers: user.familyMembers });
  })
);

router.delete(
  "/",
  asyncHandler(async (req, res) => {
    const name = normalizeMemberName(req.body?.name);
    if (!name) {
      return res.status(400).json({ error: "name is required and must be 64 characters or fewer" });
    }

    const user = await UserModel.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const nextMembers = (user.familyMembers ?? []).filter(
      (member) => member.toLocaleLowerCase() !== name.toLocaleLowerCase()
    );

    if (nextMembers.length === (user.familyMembers ?? []).length) {
      return res.status(404).json({ error: "Family member not found" });
    }

    user.familyMembers = nextMembers;
    await user.save();

    return res.json({ familyMembers: user.familyMembers });
  })
);

export default router;
