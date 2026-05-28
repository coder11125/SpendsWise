import { Router } from "express";
import { authRequired } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { ExpenseModel } from "../models/Expense.js";
import { notifyDataChanged } from "../lib/pusher.js";

const router = Router();
router.use(authRequired);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const expenses = await ExpenseModel.find({ userId: req.userId }).sort({ date: -1 }).lean();
    return res.json(expenses);
  })
);

// GET /expenses/recurring — list recurring templates
router.get(
  "/recurring",
  asyncHandler(async (req, res) => {
    const recurring = await ExpenseModel.find({
      userId: req.userId,
      "recurrence.isActive": true,
    })
      .sort({ "recurrence.nextDueDate": 1 })
      .lean();
    return res.json(recurring);
  })
);

// PUT /expenses/:id/recurring — toggle or update recurrence on a template
router.put(
  "/:id/recurring",
  asyncHandler(async (req, res) => {
    const { frequency, endDate, isActive, nextDueDate } = req.body ?? {};
    const updates: Record<string, unknown> = {};

    if (frequency !== undefined) updates["recurrence.frequency"] = frequency;
    if (endDate !== undefined) updates["recurrence.endDate"] = endDate ? new Date(endDate) : null;
    if (isActive !== undefined) updates["recurrence.isActive"] = isActive;
    if (nextDueDate !== undefined) updates["recurrence.nextDueDate"] = new Date(nextDueDate);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid recurrence fields to update" });
    }

    const expense = await ExpenseModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, recurrence: { $ne: null } },
      { $set: updates },
      { new: true }
    );

    if (!expense) return res.status(404).json({ error: "Recurring transaction not found" });
    notifyDataChanged(req.userId!);
    return res.json(expense);
  })
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const { type, amount, category, date, familyMember = "", note = "", currency = "USD", recurrence } = req.body ?? {};

    if (!type || !["income", "expense"].includes(type)) {
      return res.status(400).json({ error: "type must be 'income' or 'expense'" });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "amount must be a positive number" });
    }
    if (!category || typeof category !== "string") {
      return res.status(400).json({ error: "category is required" });
    }
    if (!date) {
      return res.status(400).json({ error: "date is required" });
    }

    const doc: Record<string, any> = {
      userId: req.userId,
      type,
      amount,
      category,
      date,
      familyMember,
      note,
      currency,
    };

    // Attach recurrence if provided
    if (recurrence && recurrence.frequency) {
      doc.recurrence = {
        frequency: recurrence.frequency,
        nextDueDate: recurrence.nextDueDate || date,
        endDate: recurrence.endDate || null,
        isActive: recurrence.isActive !== false,
      };
    }

    const expense = await ExpenseModel.create(doc);

    notifyDataChanged(req.userId!);
    return res.status(201).json(expense);
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const allowed = ["type", "amount", "category", "date", "familyMember", "note", "currency"];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (req.body?.[key] !== undefined) updates[key] = req.body[key];
    }

    // Handle recurrence updates on the PUT route too
    if (req.body?.recurrence !== undefined) {
      const rec = req.body.recurrence;
      if (rec && rec.frequency) {
        updates["recurrence"] = {
          frequency: rec.frequency,
          nextDueDate: rec.nextDueDate || req.body?.date || new Date(),
          endDate: rec.endDate || null,
          isActive: rec.isActive !== false,
        };
      } else if (rec === null) {
        updates["recurrence"] = null;
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const expense = await ExpenseModel.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId },
      { $set: updates },
      { new: true }
    );

    if (!expense) return res.status(404).json({ error: "Expense not found" });
    notifyDataChanged(req.userId!);
    return res.json(expense);
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const expense = await ExpenseModel.findOneAndDelete({ _id: req.params.id, userId: req.userId });
    if (!expense) return res.status(404).json({ error: "Expense not found" });
    notifyDataChanged(req.userId!);
    return res.json({ message: "Deleted" });
  })
);

router.delete(
  "/",
  asyncHandler(async (req, res) => {
    if (req.body?.confirm !== true) {
      return res.status(400).json({ error: "Confirmation required" });
    }
    await ExpenseModel.deleteMany({ userId: req.userId });
    notifyDataChanged(req.userId!);
    return res.json({ message: "All expenses deleted" });
  })
);

router.post(
  "/bulk",
  asyncHandler(async (req, res) => {
    const { rows } = req.body ?? {};
    if (!Array.isArray(rows) || rows.length === 0) {
      return res.status(400).json({ error: "rows must be a non-empty array" });
    }

    const docs = rows.map((row: any) => ({
      userId: req.userId,
      type: row.type,
      amount: row.amount,
      category: row.category,
      date: row.date,
      familyMember: row.familyMember ?? "",
      note: row.note ?? "",
      currency: row.currency ?? "USD",
    }));

    const result = await ExpenseModel.insertMany(docs);
    notifyDataChanged(req.userId!);
    return res.status(201).json({ count: result.length });
  })
);

export default router;
