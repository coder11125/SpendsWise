import { currencySymbols } from './constants.js';
import { convertCurrency } from './api.js';
import { getCurrentCurrency } from './state.svelte.js';

export function getCurrencySymbol(currency) {
  return currencySymbols[currency] || currency + ' ';
}

export function formatAmountWithSymbol(amount, currency) {
  return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`;
}

export async function convertToDisplayCurrency(amount, originalCurrency, displayCurrency) {
  const convertedAmount = await convertCurrency(amount, originalCurrency, displayCurrency);
  return { amount: convertedAmount, currency: displayCurrency };
}

export function compactCurrencyValue(value, symbol) {
  if (value >= 1000000) return `${symbol}${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${symbol}${(value / 1000).toFixed(1)}k`;
  return `${symbol}${value.toFixed(0)}`;
}
