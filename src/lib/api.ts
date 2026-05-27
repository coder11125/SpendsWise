import { API_BASE, RATE_CACHE_DURATION, RATE_FETCH_COOLDOWN } from './constants.js';
import {
  getCsrfToken, setCsrfToken, getIsLoggedIn,
  setExpense, getFamilyMembers, setFamilyMembers,
  setEmail, setIsLoggedIn, startPolling, stopPolling,
  getCurrentCurrency, setCurrentCurrency,
  getCurrencyRates, setCurrencyRates,
  getLastRateFetch, setLastRateFetch,
  getRateLimitHit, setRateLimitHit,
  getRateLimitHitTime, setRateLimitHitTime,
  getRateFetchAttempts,
} from './state.svelte.js';
import type { Expense, Profile } from '../types.js';

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'x-csrf-token': getCsrfToken() ?? '',
      ...(options.headers ?? {}),
    },
  });
}

export function mapServerExpense(exp: any): Expense {
  return {
    id: exp._id,
    type: exp.type as 'income' | 'expense',
    amount: exp.amount,
    category: exp.category,
    date: (exp.date ?? '').substring(0, 10),
    familyMember: exp.familyMember ?? '',
    note: exp.note ?? '',
    currency: exp.currency ?? 'USD',
  };
}

export async function fetchCsrfToken(): Promise<void> {
  try {
    const res = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setCsrfToken(data.token);
    }
  } catch {
    console.error('Unable to connect to server');
  }
}

export async function loadExpenses(): Promise<void> {
  if (!getIsLoggedIn()) return;
  try {
    const res = await apiFetch('/expenses');
    if (!res.ok) return;
    const data = await res.json();
    setExpense(data.map(mapServerExpense));
  } catch (err) {
    console.error('Failed to load expense:', err);
  }
}

async function handleJsonResponse(res: Response, fallbackError: string): Promise<any> {
  const contentType = res.headers.get('content-type');
  const isJson = contentType?.includes('application/json');
  
  if (!res.ok) {
    if (isJson) {
      const data = await res.json();
      throw new Error(data.error ?? fallbackError);
    }
    throw new Error(`Server error: ${res.status}`);
  }
  
  if (isJson) {
    return res.json();
  }
  return null;
}

export async function login(email: string, password: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() ?? '' },
    body: JSON.stringify({ email, password }),
  });
  return handleJsonResponse(res, 'Login failed');
}

export async function register(email: string, password: string): Promise<any> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() ?? '' },
    body: JSON.stringify({ email, password }),
  });
  return handleJsonResponse(res, 'Registration failed');
}

export async function logout(): Promise<void> {
  stopPolling();
  setIsLoggedIn(false);
  setExpense([]);
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() ?? '' },
    });
  } catch {}
  setFamilyMembers([]);
}

export async function checkSession(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setIsLoggedIn(true);
      setEmail(data.email);
      setFamilyMembers(data.familyMembers);
      startPolling();
      loadExpenses();
      return true;
    }
  } catch {}
  return false;
}

export function showApp(email: string, members: string[] | null = null): void {
  setIsLoggedIn(true);
  setEmail(email);
  if (Array.isArray(members)) {
    setFamilyMembers(members);
  } else {
    loadFamilyMembers();
  }
  loadExpenses();
  startPolling();
}

export async function saveTransaction({ type, amount, category, date, familyMember = '', note = '' }: Partial<Expense>): Promise<Expense | null> {
  if (!type || amount === undefined || Number.isNaN(amount) || !category || !date) return null;

  if (getIsLoggedIn()) {
    try {
      const res = await apiFetch('/expenses', {
        method: 'POST',
        body: JSON.stringify({ type, amount, category, date, familyMember, note, currency: getCurrentCurrency() }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Failed to save expense:', err.error ?? res.status);
        return null;
      }
      return mapServerExpense(await res.json());
    } catch (err) {
      console.error('Network error saving expense:', err);
      return null;
    }
  }

  return { id: String(Date.now()), type: type as 'income' | 'expense', amount, category, date, familyMember, note, currency: getCurrentCurrency() };
}

export async function deleteExpenseOnServer(id: string): Promise<boolean> {
  if (getIsLoggedIn()) {
    try {
      const res = await apiFetch(`/expenses/${id}`, { method: 'DELETE' });
      if (!res.ok && res.status !== 404) {
        console.error('Failed to delete expense, status:', res.status);
        return false;
      }
    } catch (err) {
      console.error('Network error deleting expense:', err);
      return false;
    }
  }
  return true;
}

export async function updateExpenseOnServer(id: string, data: Partial<Expense>): Promise<Expense> {
  try {
    const res = await apiFetch(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return mapServerExpense(await handleJsonResponse(res, 'Failed to save changes.'));
  } catch (err) {
    console.error('Network error editing expense:', err);
    throw err;
  }
}

export async function loadFamilyMembers(): Promise<void> {
  if (!getIsLoggedIn()) return;
  try {
    const res = await apiFetch('/family-members');
    if (!res.ok) return;
    const data = await res.json();
    setFamilyMembers(data.familyMembers);
  } catch (err) {
    console.error('Failed to load family members:', err);
  }
}

export async function addFamilyMemberOnServer(name: string): Promise<boolean> {
  if (!getIsLoggedIn()) return false;
  try {
    const res = await apiFetch('/family-members', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('Failed to save family member:', err.error ?? res.status);
      return false;
    }
    const data = await res.json();
    setFamilyMembers(data.familyMembers);
    return true;
  } catch (err) {
    console.error('Network error saving family member:', err);
    return false;
  }
}

export async function removeFamilyMemberOnServer(name: string): Promise<boolean> {
  if (getIsLoggedIn()) {
    try {
      const res = await apiFetch('/family-members', {
        method: 'DELETE',
        body: JSON.stringify({ name }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error('Failed to delete family member:', err.error ?? res.status);
        return false;
      }
      const data = await res.json();
      setFamilyMembers(data.familyMembers);
      return true;
    } catch (err) {
      console.error('Network error deleting family member:', err);
      return false;
    }
  }
  return false;
}

export async function fetchCurrencyRates(baseCurrency: string = 'USD'): Promise<any> {
  if (getRateLimitHit() && Date.now() - getRateLimitHitTime() < RATE_FETCH_COOLDOWN) {
    if (getCurrencyRates()[baseCurrency]) {
      return getCurrencyRates()[baseCurrency];
    }
    return null;
  }

  const attempts = getRateFetchAttempts();
  if (Date.now() - (attempts[baseCurrency] || 0) < 30000) return null;
  attempts[baseCurrency] = Date.now();

  if (getCurrencyRates()[baseCurrency] && Date.now() - getLastRateFetch() < RATE_CACHE_DURATION) {
    return getCurrencyRates()[baseCurrency];
  }

  try {
    const res = await apiFetch(`/currency/rates?base=${baseCurrency}`);
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      if (res.status === 429 || errorData.error?.includes('rate limit') || errorData.error?.includes('quota')) {
        setRateLimitHit(true);
        setRateLimitHitTime(Date.now());
        return null;
      }
      return null;
    }
    const data = await res.json();
    setRateLimitHit(false);
    return data.rates;
  } catch (err) {
    console.error('Currency rate fetch error:', err);
    return null;
  }
}

export async function convertCurrency(amount: number, fromCurrency: string, toCurrency: string): Promise<number> {
  if (fromCurrency === toCurrency) return amount;

  const cacheKey = fromCurrency;
  if (getCurrencyRates()[cacheKey] && Date.now() - getLastRateFetch() < RATE_CACHE_DURATION) {
    const rate = getCurrencyRates()[cacheKey][toCurrency];
    if (rate) return amount * rate;
  }

  const rates = await fetchCurrencyRates(fromCurrency);
  if (rates) {
    setCurrencyRates({ ...getCurrencyRates(), [cacheKey]: rates });
    setLastRateFetch(Date.now());
    setRateLimitHit(false);
    setRateLimitHitTime(0);
    const rate = rates[toCurrency];
    if (rate) return amount * rate;
  }

  return amount;
}

export async function uploadBulkExpenses(rows: any[]): Promise<any> {
  const res = await apiFetch('/expenses/bulk', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
  return handleJsonResponse(res, 'Bulk upload failed');
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<any> {
  const res = await apiFetch('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handleJsonResponse(res, 'Failed to update password.');
}

export async function deleteAllExpenses(): Promise<void> {
  const res = await apiFetch('/expenses', { method: 'DELETE', body: JSON.stringify({ confirm: true }) });
  if (!res.ok) throw new Error('Server error');
}

export async function sendAiMessage(message: string, history: any[]): Promise<any> {
  const res = await apiFetch('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
  return handleJsonResponse(res, 'AI request failed');
}

export async function parseWithAI(text: string): Promise<any> {
  const res = await apiFetch('/ai/parse', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  return handleJsonResponse(res, 'AI request failed');
}

export async function parseReceipt(imageData: string): Promise<any> {
  const res = await apiFetch('/ai/parse-receipt', {
    method: 'POST',
    body: JSON.stringify({ imageData }),
  });
  return handleJsonResponse(res, 'AI request failed');
}

export async function getProfile(): Promise<Profile> {
  const res = await apiFetch('/auth/me');
  return handleJsonResponse(res, 'Failed to load profile');
}
