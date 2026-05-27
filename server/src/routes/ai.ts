import { Router } from "express";
import Groq from "groq-sdk";
import { ExpenseModel } from "../models/Expense";
import { UserModel } from "../models/User";
import { authRequired } from "../middleware/auth";
import { asyncHandler } from "../middleware/asyncHandler";
import { config } from "../config";

const router = Router();
router.use(authRequired);

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

  if (!userId) return { allowed: false, dailyRemaining: 0, monthlyRemaining: 0 };
  const user = await UserModel.findById(userId).select("aiUsage").lean();
  if (!user) return { allowed: false, dailyRemaining: 0, monthlyRemaining: 0 };

  const usage = (user.aiUsage ?? {}) as {
    count?: number;
    dailyCount?: number;
    dailyDate?: string;
    monthlyCount?: number;
    monthlyDate?: string;
  };

  let dailyCount = usage.dailyDate === todayStr ? (usage.dailyCount ?? 0) : 0;
  let monthlyCount = usage.monthlyDate === monthStr ? (usage.monthlyCount ?? 0) : 0;

  const dailyRemaining = Math.max(0, config.aiDailyLimit - (dailyCount + 1));
  const monthlyRemaining = Math.max(0, config.aiMonthlyLimit - (monthlyCount + 1));

  if (dailyCount >= config.aiDailyLimit) {
    return { allowed: false, dailyRemaining: 0, monthlyRemaining };
  }
  if (monthlyCount >= config.aiMonthlyLimit) {
    return { allowed: false, dailyRemaining, monthlyRemaining: 0 };
  }

  const setFields: Record<string, unknown> = {
    "aiUsage.count": (usage.count ?? 0) + 1,
    "aiUsage.dailyCount": dailyCount + 1,
    "aiUsage.dailyDate": todayStr,
    "aiUsage.monthlyCount": monthlyCount + 1,
    "aiUsage.monthlyDate": monthStr,
  };

  await UserModel.updateOne({ _id: userId }, { $set: setFields });

  return { allowed: true, dailyRemaining, monthlyRemaining };
}

router.post(
  "/chat",
  asyncHandler(async (req, res) => {
    const { message, history = [] } = req.body ?? {};
    if (typeof message !== "string" || !message.trim()) {
      return res.status(400).json({ error: "message is required" });
    }
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: "history must be an array" });
    }

    const usage = await checkAiUsage(req.userId);
    if (!usage.allowed) {
      return res.status(429).json({
        error: usage.dailyRemaining === 0
          ? "Daily AI request limit reached. Try again tomorrow."
          : "Monthly AI request limit reached. Try again next month.",
        dailyRemaining: usage.dailyRemaining,
        monthlyRemaining: usage.monthlyRemaining,
      });
    }

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

    return res.json({
      reply: completion.choices[0]?.message?.content ?? "Sorry, I could not generate a response.",
      dailyRemaining: usage.dailyRemaining,
      monthlyRemaining: usage.monthlyRemaining,
    });
  })
);

router.post(
  "/parse",
  asyncHandler(async (req, res) => {
    const { text } = req.body ?? {};
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text is required" });
    }

    const usage = await checkAiUsage(req.userId);
    if (!usage.allowed) {
      return res.status(429).json({
        error: usage.dailyRemaining === 0
          ? "Daily AI request limit reached. Try again tomorrow."
          : "Monthly AI request limit reached. Try again next month.",
        dailyRemaining: usage.dailyRemaining,
        monthlyRemaining: usage.monthlyRemaining,
      });
    }

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
  })
);

router.post(
  "/parse-receipt",
  asyncHandler(async (req, res) => {
    const { imageData } = req.body ?? {};
    if (typeof imageData !== "string" || !imageData.startsWith("data:image/")) {
      return res.status(400).json({ error: "imageData must be a base64 data URL" });
    }

    const usage = await checkAiUsage(req.userId);
    if (!usage.allowed) {
      return res.status(429).json({
        error: usage.dailyRemaining === 0
          ? "Daily AI request limit reached. Try again tomorrow."
          : "Monthly AI request limit reached. Try again next month.",
        dailyRemaining: usage.dailyRemaining,
        monthlyRemaining: usage.monthlyRemaining,
      });
    }

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
  })
);

export default router;
