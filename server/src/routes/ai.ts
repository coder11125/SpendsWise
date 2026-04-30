import { Router } from "express";
import Groq from "groq-sdk";
import { ExpenseModel } from "../models/Expense";
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

    return res.json({ reply: completion.choices[0]?.message?.content ?? "Sorry, I could not generate a response." });
  })
);

router.post(
  "/parse",
  asyncHandler(async (req, res) => {
    const { text } = req.body ?? {};
    if (typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "text is required" });
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
      return res.json(parsed);
    } catch {
      return res.status(422).json({ error: "Could not parse expense from that text" });
    }
  })
);

export default router;
