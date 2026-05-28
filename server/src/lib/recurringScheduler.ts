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
    const todayStr = now.toISOString().substring(0, 10);

    // Find all active recurring expenses whose nextDueDate is <= now
    const dueTemplates = await ExpenseModel.find({
      "recurrence.isActive": true,
      "recurrence.nextDueDate": { $lte: now },
    }).lean();

    if (dueTemplates.length === 0) return;

    let processedCount = 0;

    for (const template of dueTemplates) {
      const rec = template.recurrence;
      if (!rec || !rec.isActive) continue;

      // Skip if endDate has passed
      if (rec.endDate && new Date(rec.endDate) < now) {
        await ExpenseModel.updateOne(
          { _id: template._id },
          { $set: { "recurrence.isActive": false } }
        );
        continue;
      }

      // Create the new expense entry from the template
      await ExpenseModel.create({
        userId: template.userId,
        type: template.type,
        amount: template.amount,
        category: template.category,
        currency: template.currency,
        familyMember: template.familyMember || "",
        note: template.note || "",
        date: new Date(rec.nextDueDate),
        recurrence: undefined, // Generated entries are not recurring themselves
      });

      // Calculate next due date
      const nextDue = calculateNextDueDate(
        new Date(rec.nextDueDate),
        rec.frequency
      );

      // Check if we've passed endDate
      const shouldDeactivate =
        rec.endDate && nextDue > new Date(rec.endDate);

      await ExpenseModel.updateOne(
        { _id: template._id },
        {
          $set: {
            "recurrence.nextDueDate": nextDue,
            "recurrence.isActive": !shouldDeactivate,
          },
        }
      );

      processedCount++;
    }

    if (processedCount > 0) {
      console.log(
        `[Recurring] Processed ${processedCount} recurring transaction(s)`
      );
      // Notify affected users
      const userIds = [
        ...new Set(dueTemplates.map((t) => String(t.userId))),
      ];
      for (const uid of userIds) {
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
