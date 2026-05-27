import { currencySymbols } from './constants.js';
import { convertCurrency } from './api.js';

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

export function compactCurrencyValue(value: number, symbol: string): string {
  if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${symbol}${(value / 1000).toFixed(1)}k`;
  return `${symbol}${value.toFixed(0)}`;
}
