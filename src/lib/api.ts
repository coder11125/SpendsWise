import { API_BASE, RATE_CACHE_DURATION, RATE_FETCH_COOLDOWN } from './constants.js';
import {
  getCsrfToken, setCsrfToken, getIsLoggedIn,
  setExpense, getFamilyMembers, setFamilyMembers,
  setEmail, setUserId, setIsLoggedIn, startPolling, stopPolling, initPusher,
  getCurrentCurrency, setCurrentCurrency,
  getCurrencyRates, setCurrencyRates,
  getLastRateFetch, setLastRateFetch,
  getRateLimitHit, setRateLimitHit,
  getRateLimitHitTime, setRateLimitHitTime,
  getRateFetchAttempts,
} from './state.svelte.js';
import type { Expense, Profile, WeeklySummary } from '../types.js';

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
    recurrence: exp.recurrence ?? null,
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
      const err = new Error(data.error ?? fallbackError) as any;
      err.status = res.status;
      if (data.retryAfter) err.retryAfter = data.retryAfter;
      throw err;
    }
    const err = new Error(`Server error: ${res.status}`) as any;
    err.status = res.status;
    throw err;
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
  setEmail('');
  try {
    await fetch(`${API_BASE}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() ?? '' },
    });
  } catch {}
  setFamilyMembers([]);
  sessionStorage.setItem('sw_logged_out', 'true');
}

export async function checkSession(): Promise<boolean> {
  sessionStorage.removeItem('sw_logged_out');
  try {
    const res = await fetch(`${API_BASE}/auth/me`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      setIsLoggedIn(true);
      setEmail(data.email);
      setUserId(data.id);
      setFamilyMembers(data.familyMembers);
      initPusher(data.id);
      startPolling();
      loadExpenses();
      if (data.timezone !== Intl.DateTimeFormat().resolvedOptions().timeZone) {
        syncTimezone();
      }
      return true;
    }
  } catch {}
  return false;
}

export function showApp(email: string, members: string[] | null = null, userId?: string): void {
  sessionStorage.removeItem('sw_logged_out');
  setIsLoggedIn(true);
  setEmail(email);
  if (userId) {
    setUserId(userId);
    initPusher(userId);
  }
  if (Array.isArray(members)) {
    setFamilyMembers(members);
  } else {
    loadFamilyMembers();
  }
  loadExpenses();
  startPolling();
  syncTimezone();
}

export async function saveTransaction({ type, amount, category, date, familyMember = '', note = '', recurrence }: Partial<Expense>): Promise<Expense | null> {
  if (!type || amount === undefined || Number.isNaN(amount) || !category || !date) return null;

  const body: Record<string, any> = { type, amount, category, date, familyMember, note, currency: getCurrentCurrency() };
  if (recurrence) {
    body.recurrence = {
      frequency: recurrence.frequency,
      nextDueDate: recurrence.nextDueDate || date,
      endDate: recurrence.endDate || null,
      isActive: recurrence.isActive,
    };
  }

  if (getIsLoggedIn()) {
    try {
      const res = await apiFetch('/expenses', {
        method: 'POST',
        body: JSON.stringify(body),
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

  return {
    id: String(Date.now()), type: type as 'income' | 'expense', amount, category, date, familyMember, note,
    currency: getCurrentCurrency(),
    recurrence: recurrence ?? null,
  };
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
  const body: Record<string, any> = {};
  if (data.type !== undefined) body.type = data.type;
  if (data.amount !== undefined) body.amount = data.amount;
  if (data.category !== undefined) body.category = data.category;
  if (data.date !== undefined) body.date = data.date;
  if (data.familyMember !== undefined) body.familyMember = data.familyMember;
  if (data.note !== undefined) body.note = data.note;
  if (data.currency !== undefined) body.currency = data.currency;
  if (data.recurrence !== undefined) {
    if (data.recurrence) {
      body.recurrence = {
        frequency: data.recurrence.frequency,
        nextDueDate: data.recurrence.nextDueDate || data.date,
        endDate: data.recurrence.endDate || null,
        isActive: data.recurrence.isActive,
      };
    } else {
      body.recurrence = null;
    }
  }
  try {
    const res = await apiFetch(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(body),
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

export async function fetchAiQuota(): Promise<{ weeklyRemaining: number }> {
  const res = await apiFetch('/ai/quota');
  return handleJsonResponse(res, 'Failed to fetch AI quota');
}

export async function fetchSummaries(): Promise<{ summaries: WeeklySummary[] }> {
  const res = await apiFetch('/summaries');
  return handleJsonResponse(res, 'Failed to fetch summaries');
}

export async function syncTimezone(): Promise<void> {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!timezone) return;
    await apiFetch('/auth/timezone', {
      method: 'PUT',
      body: JSON.stringify({ timezone }),
    });
  } catch {
    // best-effort — a missing/stale timezone just falls back to UTC server-side
  }
}

export async function sendAiMessage(message: string, history: any[]): Promise<any> {
  const res = await apiFetch('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
  return handleJsonResponse(res, 'AI request failed');
}

export async function loadRecurringExpenses(): Promise<Expense[]> {
  try {
    const res = await apiFetch('/expenses/recurring');
    if (!res.ok) return [];
    const data = await res.json();
    return data.map(mapServerExpense);
  } catch {
    return [];
  }
}

export async function updateRecurring(id: string, updates: { frequency?: string; endDate?: string | null; isActive?: boolean; nextDueDate?: string }): Promise<Expense | null> {
  try {
    const res = await apiFetch(`/expenses/${id}/recurring`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    if (!res.ok) return null;
    return mapServerExpense(await res.json());
  } catch {
    return null;
  }
}

export async function parseReceipt(imageData: string, pro = false): Promise<any> {
  const res = await apiFetch('/ai/parse-receipt', {
    method: 'POST',
    body: JSON.stringify({ imageData, pro }),
  });
  return handleJsonResponse(res, 'AI request failed');
}

export async function parseReceiptsBulk(images: string[], pro = false): Promise<any> {
  const res = await apiFetch('/ai/parse-receipts-bulk', {
    method: 'POST',
    body: JSON.stringify({ images, pro }),
  });
  return handleJsonResponse(res, 'AI request failed');
}

export async function getProfile(): Promise<Profile> {
  const res = await apiFetch('/auth/me');
  return handleJsonResponse(res, 'Failed to load profile');
}
