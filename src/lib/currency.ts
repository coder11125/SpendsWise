import { currencySymbols } from './constants.js';
import { convertCurrency, fetchCurrencyRates } from './api.js';
import { RATE_CACHE_DURATION } from './constants.js';
import { getCurrencyRates, setCurrencyRates, getLastRateFetch, setLastRateFetch } from './state.svelte.js';

export function getCurrencySymbol(currency: string): string {
  return currencySymbols[currency] || currency + ' ';
}

export function formatAmountWithSymbol(amount: number, currency: string): string {
  return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`;
}

export async function convertToDisplayCurrency(amount: number, originalCurrency: string, displayCurrency: string): Promise<{ amount: number; currency: string }> {
  const convertedAmount = await convertCurrency(amount, originalCurrency, displayCurrency);
  return { amount: convertedAmount, currency: displayCurrency };
}

function getCachedRate(fromCurrency: string, toCurrency: string): number | null {
  if (fromCurrency === toCurrency) return 1;
  const rates = getCurrencyRates()[fromCurrency];
  if (rates && Date.now() - getLastRateFetch() < RATE_CACHE_DURATION) {
    return rates[toCurrency] ?? null;
  }
  return null;
}

// Ensures every currency in `fromCurrencies` has a cached rate to
// `toCurrency` before a bulk calculation runs its (synchronous) math loop.
// Fetches all cache misses in parallel instead of the loop awaiting one
// currency conversion at a time.
export async function warmConversionRates(fromCurrencies: Iterable<string>, toCurrency: string): Promise<void> {
  const missing = [...new Set(fromCurrencies)].filter(from => from !== toCurrency && getCachedRate(from, toCurrency) === null);
  if (missing.length === 0) return;

  const results = await Promise.all(missing.map(async from => ({ from, rates: await fetchCurrencyRates(from) })));
  let updated = getCurrencyRates();
  for (const { from, rates } of results) {
    if (rates) updated = { ...updated, [from]: rates };
  }
  setCurrencyRates(updated);
  setLastRateFetch(Date.now());
}

// Synchronous conversion for use after warmConversionRates() has resolved.
// Falls back to the original amount if a rate still isn't available, same
// as the async convertCurrency()'s no-rate fallback.
export function convertToDisplayCurrencySync(amount: number, originalCurrency: string, displayCurrency: string): { amount: number; currency: string } {
  const rate = getCachedRate(originalCurrency, displayCurrency);
  return { amount: rate != null ? amount * rate : amount, currency: displayCurrency };
}

export function compactCurrencyValue(value: number, symbol: string): string {
  if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${symbol}${(value / 1000).toFixed(1)}k`;
  return `${symbol}${value.toFixed(0)}`;
}
