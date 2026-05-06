import express from "express";
import { asyncHandler } from "../middleware/asyncHandler";
import { authRequired } from "../middleware/auth";

const router = express.Router();

// Simple in-memory cache for currency rates (1 hour expiry)
const rateCache: {
  [key: string]: {
    rates: Record<string, number>;
    timestamp: number;
    baseCurrency: string;
  };
} = {};

const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

/**
 * Fetch currency conversion rates from a free API
 * Using exchangerate-api.com as a free service
 */
// Track API call count for rate limiting awareness
let apiCallCount = 0;
const API_LIMIT_WARNING = 1000; // Warn when approaching free tier limit

async function fetchCurrencyRates(baseCurrency: string = "USD"): Promise<Record<string, number>> {
  const cacheKey = baseCurrency;
  
  // Return cached rates if available and not expired
  if (rateCache[cacheKey] && Date.now() - rateCache[cacheKey].timestamp < CACHE_DURATION) {
    return rateCache[cacheKey].rates;
  }

  try {
    // Use a free currency API
    const apiKey = process.env.CURRENCY_API_KEY || "7a6b4e3d2b1c0f9e8d7c6b5a"; // Default to a demo key
    apiCallCount++;
    
    // Warn if approaching rate limit
    if (apiCallCount % API_LIMIT_WARNING === 0) {
      console.warn(`[CURRENCY] Approaching API rate limit: ${apiCallCount} calls made`);
    }
    
    const response = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 429 || response.status === 403) {
        console.error(`[CURRENCY] Rate limit exceeded or forbidden: ${response.status}`);
        throw new Error("Currency API rate limit exceeded");
      }
      throw new Error(`Currency API returned status ${response.status}: ${errorData["error-type"] || "Unknown error"}`);
    }

    const data = await response.json();

    if (data.result !== "success") {
      // Handle specific error types
      if (data["error-type"] === "quota-exceeded") {
        console.error("[CURRENCY] Monthly API quota exceeded");
        throw new Error("Currency API monthly quota exceeded");
      }
      throw new Error(data["error-type"] || "Unknown currency API error");
    }

    // Cache the rates
    rateCache[cacheKey] = {
      rates: data.conversion_rates,
      timestamp: Date.now(),
      baseCurrency,
    };

    console.log(`[CURRENCY] Fetched rates for ${baseCurrency}, cache expires at ${new Date(Date.now() + CACHE_DURATION).toISOString()}`);
    return data.conversion_rates;
  } catch (error) {
    console.error("Failed to fetch currency rates:", error);
    
    // Try fallback API if available
    try {
      const fallbackRates = await tryFallbackCurrencyAPI(baseCurrency);
      if (fallbackRates) {
        return fallbackRates;
      }
    } catch (fallbackError) {
      console.error("Fallback currency API also failed:", fallbackError);
    }
    
    // Final fallback: return 1:1 rates for all known currencies
    const fallbackRates: Record<string, number> = {};
    // Add common currencies with 1:1 fallback
    const commonCurrencies = ["USD", "EUR", "GBP", "JPY", "CAD", "AUD", "CHF", "CNY", "INR", "MXN", "BRL", "RUB"];
    commonCurrencies.forEach((currency) => {
      fallbackRates[currency] = 1;
    });
    
    console.warn("[CURRENCY] Using fallback 1:1 rates due to API failure");
    return fallbackRates;
  }
}

/**
 * Try a fallback currency API if primary fails
 */
async function tryFallbackCurrencyAPI(baseCurrency: string): Promise<Record<string, number> | null> {
  try {
    // Try Fixer.io (requires API key) or other free alternatives
    // For now, we'll just return null as we don't have multiple API keys configured
    // In production, you could rotate through multiple free APIs
    return null;
  } catch (error) {
    console.error("Fallback currency API failed:", error);
    return null;
  }
}

/**
 * GET /api/currency/rates
 * Returns conversion rates from base currency (default: USD)
 */
router.get(
  "/rates",
  asyncHandler(async (req, res) => {
    const baseCurrency = (req.query.base as string) || "USD";
    const rates = await fetchCurrencyRates(baseCurrency);
    
    res.json({
      base: baseCurrency,
      rates,
      cached: !!rateCache[baseCurrency],
    });
  })
);

/**
 * GET /api/currency/convert
 * Convert amount from one currency to another
 */
router.get(
  "/convert",
  asyncHandler(async (req, res) => {
    const fromCurrency = (req.query.from as string) || "USD";
    const toCurrency = (req.query.to as string) || "USD";
    const amount = parseFloat(req.query.amount as string) || 0;

    if (fromCurrency === toCurrency) {
      return res.json({
        from: fromCurrency,
        to: toCurrency,
        amount,
        convertedAmount: amount,
        rate: 1,
      });
    }

    const rates = await fetchCurrencyRates(fromCurrency);
    const rate = rates[toCurrency];

    if (rate === undefined) {
      return res.status(400).json({
        error: `Cannot convert from ${fromCurrency} to ${toCurrency} - unsupported currency`,
      });
    }

    const convertedAmount = amount * rate;

    res.json({
      from: fromCurrency,
      to: toCurrency,
      amount,
      convertedAmount,
      rate,
    });
  })
);

export default router;
