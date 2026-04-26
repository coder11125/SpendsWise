import { Router } from "express";
import { Types } from "mongoose";
import { ExpenseModel } from "../models/Expense";
import { authRequired } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";

const router = Router();

router.use(authRequired);

function isValidId(id: string): boolean {
  return Types.ObjectId.isValid(id);
}

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const expenses = await ExpenseModel.find({ userId: req.userId }).sort({ date: -1 });
    return res.json(expenses);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { amount, category, note, date, type, currency, familyMember } = req.body ?? {};
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > 1e12) {
      return res.status(400).json({ error: "amount must be a finite number >= 0 and <= 1,000,000,000,000" });
    }
    if (typeof category !== "string" || !category.trim() || category.length > 64) {
      return res.status(400).json({ error: "category is required and must be 64 characters or fewer" });
    }
    if (type !== "income" && type !== "expense") {
      return res.status(400).json({ error: "type must be 'income' or 'expense'" });
    }
    const parsedDate = date ? new Date(date) : new Date();
    if (date && (Number.isNaN(parsedDate.getTime()) || parsedDate.getFullYear() < 1970 || parsedDate.getFullYear() > 2100)) {
      return res.status(400).json({ error: "Invalid date" });
    }
    const resolvedCurrency = typeof currency === "string" && currency.trim() ? currency.trim() : "USD";
    if (!/^[A-Z]{2,8}$/.test(resolvedCurrency)) {
      return res.status(400).json({ error: "Invalid currency code" });
    }
    const resolvedFamilyMember = typeof familyMember === "string" ? familyMember.trim().slice(0, 64) : "";
    const resolvedNote = typeof note === "string" ? note.slice(0, 500) : "";
    const expense = await ExpenseModel.create({
      userId: req.userId,
      type,
      amount,
      category: category.trim(),
      currency: resolvedCurrency,
      familyMember: resolvedFamilyMember,
      note: resolvedNote,
      date: parsedDate,
    });
    return res.status(201).json(expense);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });

    const { amount, category, note, date, type, currency, familyMember } = req.body ?? {};
    const update: Record<string, unknown> = {};
    if (amount !== undefined) {
      if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0 || amount > 1e12)
        return res.status(400).json({ error: "amount must be a finite number >= 0 and <= 1,000,000,000,000" });
      update.amount = amount;
    }
    if (category !== undefined) {
      if (typeof category !== "string" || !category.trim() || category.length > 64)
        return res.status(400).json({ error: "category must be a non-empty string of 64 characters or fewer" });
      update.category = category.trim();
    }
    if (note !== undefined) {
      if (typeof note !== "string") return res.status(400).json({ error: "Invalid note" });
      update.note = note.slice(0, 500);
    }
    if (date !== undefined) {
      const d = new Date(date);
      if (Number.isNaN(d.getTime()) || d.getFullYear() < 1970 || d.getFullYear() > 2100)
        return res.status(400).json({ error: "Invalid date" });
      update.date = d;
    }
    if (type !== undefined) {
      if (type !== "income" && type !== "expense") return res.status(400).json({ error: "Invalid type" });
      update.type = type;
    }
    if (currency !== undefined) {
      if (typeof currency !== "string" || !/^[A-Z]{2,8}$/.test(currency.trim()))
        return res.status(400).json({ error: "Invalid currency code" });
      update.currency = currency.trim();
    }
    if (familyMember !== undefined) {
      if (typeof familyMember !== "string") return res.status(400).json({ error: "Invalid familyMember" });
      update.familyMember = familyMember.trim().slice(0, 64);
    }

    const expense = await ExpenseModel.findOneAndUpdate(
      { _id: id, userId: req.userId },
      update,
      { new: true }
    );
    if (!expense) return res.status(404).json({ error: "Not found" });
    return res.json(expense);
  })
);

router.delete(
  "/",
  asyncHandler(async (req, res) => {
    await ExpenseModel.deleteMany({ userId: req.userId });
    return res.status(204).send();
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });

    const result = await ExpenseModel.deleteOne({ _id: id, userId: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: "Not found" });
    return res.status(204).send();
  })
);

export default router;
