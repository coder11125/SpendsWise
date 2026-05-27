import express from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = express.Router();

const rateCache: {
  [key: string]: {
    rates: Record<string, number>;
    timestamp: number;
  };
} = {};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

async function fetchCurrencyRates(baseCurrency: string = "USD"): Promise<Record<string, number>> {
  const cacheKey = baseCurrency;

  if (rateCache[cacheKey] && Date.now() - rateCache[cacheKey].timestamp < CACHE_DURATION) {
    return rateCache[cacheKey].rates;
  }

  try {
    const response = await fetch(`https://open.er-api.com/v6/latest/${baseCurrency}`);

    if (!response.ok) {
      throw new Error(`Currency API returned status ${response.status}`);
    }

    const data = await response.json();

    if (data.result !== "success") {
      throw new Error(data["error-type"] || "Currency API returned non-success result");
    }

    rateCache[cacheKey] = {
      rates: data.rates,
      timestamp: Date.now(),
    };

    console.log(`[CURRENCY] Fetched rates for ${baseCurrency}`);
    return data.rates;
  } catch (error) {
    console.error("[CURRENCY] Failed to fetch rates:", error);

    // Return 1:1 fallback so the app doesn't crash
    const fallback: Record<string, number> = {};
    ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "MXN", "BRL", "RUB"].forEach(
      (c) => { fallback[c] = 1; }
    );
    return fallback;
  }
}

router.get(
  "/rates",
  asyncHandler(async (req, res) => {
    const baseCurrency = (req.query.base as string) || "USD";
    const rates = await fetchCurrencyRates(baseCurrency);
    res.json({ base: baseCurrency, rates, cached: !!rateCache[baseCurrency] });
  })
);

router.get(
  "/convert",
  asyncHandler(async (req, res) => {
    const fromCurrency = (req.query.from as string) || "USD";
    const toCurrency = (req.query.to as string) || "USD";
    const amount = parseFloat(req.query.amount as string) || 0;

    if (fromCurrency === toCurrency) {
      return res.json({ from: fromCurrency, to: toCurrency, amount, convertedAmount: amount, rate: 1 });
    }

    const rates = await fetchCurrencyRates(fromCurrency);
    const rate = rates[toCurrency];

    if (rate === undefined) {
      return res.status(400).json({ error: `Cannot convert from ${fromCurrency} to ${toCurrency}` });
    }

    res.json({ from: fromCurrency, to: toCurrency, amount, convertedAmount: amount * rate, rate });
  })
);

export default router;
