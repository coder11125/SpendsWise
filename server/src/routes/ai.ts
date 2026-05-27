import { Router } from "express";
import Groq from "groq-sdk";
import { ExpenseModel } from "../models/Expense.js";
import { UserModel } from "../models/User.js";
import { authRequired } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { config } from "../config.js";
import {
  userBurstLimiter,
  groqSlidingLimiter,
  acquireGroqSlot,
  releaseGroqSlot,
  getActiveGroqCount,
  MAX_CONCURRENT_GROQ,
} from "../middleware/groqRateLimiter.js";

const router = Router();
router.use(authRequired);

router.use((req, res, next) => {
  if (!userBurstLimiter.allow(String(req.userId ?? req.ip), 10)) {
    res.status(429).json({
      error: "Too many AI requests. Please slow down and wait a moment.",
      retryAfter: 60,
    });
    return;
  }
  next();
});

function logAiEvent(event: Record<string, unknown>): void {
  console.log(JSON.stringify({ event: "ai_request", timestamp: new Date().toISOString(), ...event }));
}

function groqClient() {
  if (!config.groqApiKey) {
    const err = new Error("AI features require GROQ_API_KEY to be set") as Error & { status: number };
    err.status = 503;
    throw err;
  }
  return new Groq({ apiKey: config.groqApiKey });
}

function groqVisionClient() {
  const key = config.groqVisionApiKey || config.groqApiKey;
  if (!key) {
    const err = new Error("AI features require GROQ_API_KEY to be set") as Error & { status: number };
    err.status = 503;
    throw err;
  }
  return new Groq({ apiKey: key });
}

async function checkAiUsage(userId: string | undefined): Promise<{
  allowed: boolean;
  dailyRemaining: number;
  monthlyRemaining: number;
}> {
  const now = new Date();
  const todayStr = now.toISOString().substring(0, 10);
  const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  if (!userId) {
    return { allowed: false, dailyRemaining: 0, monthlyRemaining: 0 };
  }

  const user = await UserModel.findById(userId).select("aiUsage").lean();
  const u = (user?.aiUsage ?? {}) as {
    dailyCount?: number;
    monthlyCount?: number;
    dailyDate?: string;
    monthlyDate?: string;
  };

  const currentDaily = u.dailyDate === todayStr ? (u.dailyCount ?? 0) : 0;
  const currentMonthly = u.monthlyDate === monthStr ? (u.monthlyCount ?? 0) : 0;

  if (currentDaily >= config.aiDailyLimit || currentMonthly >= config.aiMonthlyLimit) {
    return {
      allowed: false,
      dailyRemaining: Math.max(0, config.aiDailyLimit - currentDaily),
      monthlyRemaining: Math.max(0, config.aiMonthlyLimit - currentMonthly),
    };
  }

  const update: Record<string, any> = { $inc: { "aiUsage.count": 1 } };
  const $set: Record<string, any> = {};

  if (u.dailyDate === todayStr) {
    update.$inc["aiUsage.dailyCount"] = 1;
  } else {
    $set["aiUsage.dailyCount"] = currentDaily + 1;
    $set["aiUsage.dailyDate"] = todayStr;
  }

  if (u.monthlyDate === monthStr) {
    update.$inc["aiUsage.monthlyCount"] = 1;
  } else {
    $set["aiUsage.monthlyCount"] = currentMonthly + 1;
    $set["aiUsage.monthlyDate"] = monthStr;
  }

  if (Object.keys($set).length) {
    update.$set = $set;
  }

  await UserModel.updateOne({ _id: userId }, update);

  return {
    allowed: true,
    dailyRemaining: Math.max(0, config.aiDailyLimit - currentDaily - 1),
    monthlyRemaining: Math.max(0, config.aiMonthlyLimit - currentMonthly - 1),
  };
}

function rejectIfUnavailable(res: any, req: any, endpoint: string, start: number): boolean {
  if (!groqSlidingLimiter.allow(config.groqApiKey, 25)) {
    logAiEvent({
      userId: req.userId, endpoint, duration: Date.now() - start,
      status: "rate_limited", error: "groq_rate_limit",
    });
    res.status(429).json({
      error: "AI service is temporarily busy. Please try again shortly.",
      retryAfter: 60,
    });
    return true;
  }
  if (!acquireGroqSlot()) {
    logAiEvent({
      userId: req.userId, endpoint, duration: Date.now() - start,
      status: "rate_limited", error: "concurrency_limit",
      activeRequests: getActiveGroqCount(),
    });
    res.status(503).json({
      error: "AI service is at capacity. Please try again shortly.",
    });
    return true;
  }
  return false;
}

function rejectQuotaExceeded(
  res: any, usage: { allowed: boolean; dailyRemaining: number; monthlyRemaining: number },
  req: any, endpoint: string, start: number
): boolean {
  if (!usage.allowed) {
    const isDaily = usage.dailyRemaining === 0;
    logAiEvent({
      userId: req.userId, endpoint, duration: Date.now() - start,
      status: "rate_limited", error: isDaily ? "daily_quota" : "monthly_quota",
      dailyRemaining: usage.dailyRemaining,
      monthlyRemaining: usage.monthlyRemaining,
    });
    res.status(429).json({
      error: isDaily
        ? "Daily AI request limit reached. Try again tomorrow."
        : "Monthly AI request limit reached. Try again next month.",
      dailyRemaining: usage.dailyRemaining,
      monthlyRemaining: usage.monthlyRemaining,
    });
    return true;
  }
  return false;
}

router.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const start = Date.now();
    const { message, history = [] } = req.body ?? {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: "history must be an array" });
    }

    const usage = await checkAiUsage(req.userId);
    if (rejectQuotaExceeded(res, usage, req, "/chat", start)) return;
    if (rejectIfUnavailable(res, req, "/chat", start)) return;

    try {
      const expenses = await ExpenseModel.find({ userId: req.userId }).sort({ date: -1 }).lean();
      const totalIncome = expenses.filter((e) => e.type === "income").reduce((s, e) => s + e.amount, 0);
      const totalExpense = expenses.filter((e) => e.type === "expense").reduce((s, e) => s + e.amount, 0);

      const lines = expenses.map((e) => {
        const d = new Date(e.date).toISOString().substring(0, 10);
        const note = e.note ? ` | ${e.note}` : "";
        const member = e.familyMember ? ` (${e.familyMember})` : "";
        return `${d} | ${e.type} | ${e.currency} ${e.amount} | ${e.category}${note}${member}`;
      });

      const systemPrompt = `You are a personal finance assistant for SpendsWise.
Today: ${new Date().toISOString().substring(0, 10)}
Total Income: ${totalIncome} | Total Expenses: ${totalExpense} | Balance: ${totalIncome - totalExpense}

Transaction history (newest first):
${lines.length ? lines.join("\n") : "No transactions yet."}

Be concise, specific to the user's actual data, and actionable.`;

      const safeHistory = history
        .slice(-10)
        .filter(
          (m: unknown): m is { role: string; content: string } =>
            !!m &&
            typeof (m as Record<string, unknown>).role === "string" &&
            typeof (m as Record<string, unknown>).content === "string"
        )
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const completion = await groqClient().chat.completions.create({
        model: config.groqModel,
        messages: [{ role: "system", content: systemPrompt }, ...safeHistory, { role: "user", content: message.trim() }],
        max_tokens: 1024,
      });

      logAiEvent({
        userId: req.userId, endpoint: "/chat", duration: Date.now() - start,
        status: "success", dailyRemaining: usage.dailyRemaining,
        monthlyRemaining: usage.monthlyRemaining, groqModel: config.groqModel,
        groqTokens: completion.usage?.total_tokens ?? null,
      });

      return res.json({
        reply: completion.choices[0]?.message?.content ?? "Sorry, I could not generate a response.",
        dailyRemaining: usage.dailyRemaining,
        monthlyRemaining: usage.monthlyRemaining,
      });
    } catch (err) {
      logAiEvent({
        userId: req.userId, endpoint: "/chat", duration: Date.now() - start,
        status: "error", error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      releaseGroqSlot();
    }
  })
);

router.post(
  "/parse",
  asyncHandler(async (req, res) => {
    const start = Date.now();
    const { text } = req.body ?? {};
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text is required" });
    }

    const usage = await checkAiUsage(req.userId);
    if (rejectQuotaExceeded(res, usage, req, "/parse", start)) return;
    if (rejectIfUnavailable(res, req, "/parse", start)) return;

    try {
      const today = new Date().toISOString().substring(0, 10);
      const completion = await groqClient().chat.completions.create({
        model: config.groqModel,
        messages: [
          {
            role: "user",
            content: `Extract expense or income details from the text below. Return ONLY a JSON object, no extra text.
Text: "${text.trim().replace(/"/g, "'")}"
Today: ${today}

JSON fields:
- type: "expense" or "income"
- amount: number (required, positive)
- category: one of: Food & Dining, Housing, Transportation, Utilities, Entertainment, Healthcare, Shopping, Salary, Freelance, Investments, Gifts, Other
- date: "YYYY-MM-DD" if mentioned, else null
- note: short description string or ""
- currency: 3-letter uppercase code if mentioned, else null

Example: {"type":"expense","amount":450,"category":"Food & Dining","date":null,"note":"lunch","currency":null}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.1,
      });

      logAiEvent({
        userId: req.userId, endpoint: "/parse", duration: Date.now() - start,
        status: "success", dailyRemaining: usage.dailyRemaining,
        monthlyRemaining: usage.monthlyRemaining, groqModel: config.groqModel,
        groqTokens: completion.usage?.total_tokens ?? null,
      });

      const content = completion.choices[0]?.message?.content ?? "";
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return res.status(422).json({ error: "Could not parse expense from that text" });

      try {
        const parsed = JSON.parse(match[0]);
        if (typeof parsed.amount !== "number" || parsed.amount <= 0) {
          return res.status(422).json({ error: "Could not find a valid amount" });
        }
        return res.json({ ...parsed, dailyRemaining: usage.dailyRemaining, monthlyRemaining: usage.monthlyRemaining });
      } catch {
        return res.status(422).json({ error: "Could not parse expense from that text" });
      }
    } catch (err) {
      logAiEvent({
        userId: req.userId, endpoint: "/parse", duration: Date.now() - start,
        status: "error", error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      releaseGroqSlot();
    }
  })
);

router.post(
  "/parse-receipt",
  asyncHandler(async (req, res) => {
    const start = Date.now();
    const { imageData } = req.body ?? {};
    if (typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
      return res.status(400).json({ error: "imageData must be a base64 data URL" });
    }

    const usage = await checkAiUsage(req.userId);
    if (rejectQuotaExceeded(res, usage, req, "/parse-receipt", start)) return;

    const visionKey = config.groqVisionApiKey || config.groqApiKey;
    if (!groqSlidingLimiter.allow(visionKey, 25)) {
      logAiEvent({
        userId: req.userId, endpoint: "/parse-receipt", duration: Date.now() - start,
        status: "rate_limited", error: "groq_rate_limit",
      });
      return res.status(429).json({
        error: "AI service is temporarily busy. Please try again shortly.",
        retryAfter: 60,
      });
    }
    if (!acquireGroqSlot()) {
      logAiEvent({
        userId: req.userId, endpoint: "/parse-receipt", duration: Date.now() - start,
        status: "rate_limited", error: "concurrency_limit",
        activeRequests: getActiveGroqCount(),
      });
      return res.status(503).json({
        error: "AI service is at capacity. Please try again shortly.",
      });
    }

    try {
      const today = new Date().toISOString().substring(0, 10);
      const completion = await groqVisionClient().chat.completions.create({
        model: config.groqVisionModel,
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: { url: imageData },
              },
              {
                type: "text",
                text: `Extract expense or income details from this receipt or billing statement. Return ONLY a JSON object, no extra text.
Today: ${today}

JSON fields:
- type: "expense" or "income"
- amount: number (required, positive, total/grand total if multiple items)
- category: one of: Food & Dining, Housing, Transportation, Utilities, Entertainment, Healthcare, Shopping, Salary, Freelance, Investments, Gifts, Other
- date: "YYYY-MM-DD" if visible on receipt, else null
- note: merchant name or short description string or ""
- currency: 3-letter uppercase code if visible, else null

Example: {"type":"expense","amount":24.50,"category":"Food & Dining","date":"2024-03-15","note":"Starbucks","currency":"USD"}`,
              },
            ],
          },
        ],
        max_tokens: 200,
        temperature: 0.1,
      });

      logAiEvent({
        userId: req.userId, endpoint: "/parse-receipt", duration: Date.now() - start,
        status: "success", dailyRemaining: usage.dailyRemaining,
        monthlyRemaining: usage.monthlyRemaining, groqModel: config.groqVisionModel,
        groqTokens: completion.usage?.total_tokens ?? null,
      });

      const content = completion.choices[0]?.message?.content ?? "";
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return res.status(422).json({ error: "Could not extract expense from this receipt" });

      try {
        const parsed = JSON.parse(match[0]);
        if (typeof parsed.amount !== "number" || parsed.amount <= 0) {
          return res.status(422).json({ error: "Could not find a valid amount on the receipt" });
        }
        return res.json({ ...parsed, dailyRemaining: usage.dailyRemaining, monthlyRemaining: usage.monthlyRemaining });
      } catch {
        return res.status(422).json({ error: "Could not extract expense from this receipt" });
      }
    } catch (err) {
      logAiEvent({
        userId: req.userId, endpoint: "/parse-receipt", duration: Date.now() - start,
        status: "error", error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      releaseGroqSlot();
    }
  })
);

export default router;
