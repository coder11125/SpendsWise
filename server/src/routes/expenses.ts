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
    const { amount, category, note, date } = req.body ?? {};
    if (typeof amount !== "number" || amount < 0 || typeof category !== "string" || !category.trim()) {
      return res.status(400).json({ error: "amount (>=0) and category are required" });
    }
    const expense = await ExpenseModel.create({
      userId: req.userId,
      amount,
      category,
      note: typeof note === "string" ? note : "",
      date: date ? new Date(date) : new Date(),
    });
    return res.status(201).json(expense);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const { id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ error: "Invalid id" });

    const { amount, category, note, date } = req.body ?? {};
    const update: Record<string, unknown> = {};
    if (amount !== undefined) {
      if (typeof amount !== "number" || amount < 0) return res.status(400).json({ error: "Invalid amount" });
      update.amount = amount;
    }
    if (category !== undefined) {
      if (typeof category !== "string" || !category.trim()) return res.status(400).json({ error: "Invalid category" });
      update.category = category;
    }
    if (note !== undefined) {
      if (typeof note !== "string") return res.status(400).json({ error: "Invalid note" });
      update.note = note;
    }
    if (date !== undefined) update.date = new Date(date);

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
