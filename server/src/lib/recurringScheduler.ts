import { ExpenseModel } from "../models/Expense.js";
import { notifyDataChanged } from "./pusher.js";

/**
 * Calculate the next due date based on frequency and current due date.
 */
function calculateNextDueDate(
  currentDue: Date,
  frequency: string
): Date {
  const next = new Date(currentDue);
  switch (frequency) {
    case "daily":
      next.setDate(next.getDate() + 1);
      break;
    case "weekly":
      next.setDate(next.getDate() + 7);
      break;
    case "biweekly":
      next.setDate(next.getDate() + 14);
      break;
    case "monthly":
      next.setMonth(next.getMonth() + 1);
      break;
    case "yearly":
      next.setFullYear(next.getFullYear() + 1);
      break;
  }
  return next;
}

/**
 * Process all recurring transactions that are due.
 * For each due recurring template, creates a new expense entry
 * and advances the nextDueDate. Deactivates if endDate is reached.
 */
export async function processRecurringTransactions(): Promise<void> {
  try {
    const now = new Date();
    let processedCount = 0;
    const notifiedUsers = new Set<string>();

    // Process one template at a time using an atomic claim to prevent duplicate
    // entries when multiple instances run concurrently (e.g. serverless warm starts).
    // The claim works by advancing nextDueDate as part of the findOneAndUpdate filter:
    // a second concurrent process will no longer match the same nextDueDate and skips it.
    while (true) {
      const template = await ExpenseModel.findOne({
        "recurrence.isActive": true,
        "recurrence.nextDueDate": { $lte: now },
      }).lean();

      if (!template) break;

      const rec = template.recurrence;
      if (!rec || !rec.isActive) break;

      // Deactivate immediately if endDate has already passed
      if (rec.endDate && new Date(rec.endDate) < now) {
        await ExpenseModel.findOneAndUpdate(
          { _id: template._id, "recurrence.nextDueDate": rec.nextDueDate },
          { $set: { "recurrence.isActive": false } }
        );
        continue;
      }

      const nextDue = calculateNextDueDate(new Date(rec.nextDueDate), rec.frequency);
      const shouldDeactivate = !!(rec.endDate && nextDue > new Date(rec.endDate));

      // Atomically advance nextDueDate — if another process already did this,
      // the filter won't match and claimed will be null (skip without duplicating).
      const claimed = await ExpenseModel.findOneAndUpdate(
        { _id: template._id, "recurrence.nextDueDate": rec.nextDueDate },
        { $set: { "recurrence.nextDueDate": nextDue, "recurrence.isActive": !shouldDeactivate } },
        { new: false }
      );

      if (!claimed) continue; // another instance already processed this template

      await ExpenseModel.create({
        userId: template.userId,
        type: template.type,
        amount: template.amount,
        category: template.category,
        currency: template.currency,
        familyMember: template.familyMember || "",
        note: template.note || "",
        date: new Date(rec.nextDueDate),
        recurrence: undefined,
      });

      notifiedUsers.add(String(template.userId));
      processedCount++;
    }

    if (processedCount > 0) {
      console.log(`[Recurring] Processed ${processedCount} recurring transaction(s)`);
      for (const uid of notifiedUsers) {
        notifyDataChanged(uid);
      }
    }
  } catch (err) {
    console.error("[Recurring] Error processing recurring transactions:", err);
  }
}

/**
 * Start the recurring transaction scheduler.
 * Checks every 60 seconds for due transactions.
 */
let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startRecurringScheduler(): void {
  if (schedulerInterval) return;
  console.log("[Recurring] Starting recurring transaction scheduler (60s interval)");
  schedulerInterval = setInterval(processRecurringTransactions, 60_000);
  // Run immediately on startup
  processRecurringTransactions();
}

export function stopRecurringScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
  }
}
