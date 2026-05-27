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

export async function apiFetch(path, options = {}) {
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

export function mapServerExpense(exp) {
  return {
    id: exp._id,
    type: exp.type,
    amount: exp.amount,
    category: exp.category,
    date: (exp.date ?? '').substring(0, 10),
    familyMember: exp.familyMember ?? '',
    note: exp.note ?? '',
    currency: exp.currency ?? 'USD',
  };
}

export async function fetchCsrfToken() {
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

export async function loadExpenses() {
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

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() ?? '' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Login failed');
  return data;
}

export async function register(email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': getCsrfToken() ?? '' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Registration failed');
  return data;
}

export async function logout() {
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

export async function checkSession() {
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

export function showApp(email, members = null) {
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

export async function saveTransaction({ type, amount, category, date, familyMember = '', note = '' }) {
  if (!type || Number.isNaN(amount) || !category || !date) return null;

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

  return { id: String(Date.now()), type, amount, category, date, familyMember, note, currency: getCurrentCurrency() };
}

export async function deleteExpenseOnServer(id) {
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

export async function updateExpenseOnServer(id, data) {
  try {
    const res = await apiFetch(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Failed to save changes.');
    }
    return mapServerExpense(await res.json());
  } catch (err) {
    console.error('Network error editing expense:', err);
    throw err;
  }
}

export async function loadFamilyMembers() {
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

export async function addFamilyMemberOnServer(name) {
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

export async function removeFamilyMemberOnServer(name) {
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

export async function fetchCurrencyRates(baseCurrency = 'USD') {
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

export async function convertCurrency(amount, fromCurrency, toCurrency) {
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

export async function uploadBulkExpenses(rows) {
  const res = await apiFetch('/expenses/bulk', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
  return await res.json();
}

export async function changePassword(currentPassword, newPassword) {
  const res = await apiFetch('/auth/password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? 'Failed to update password.');
  return data;
}

export async function deleteAllExpenses() {
  const res = await apiFetch('/expenses', { method: 'DELETE', body: JSON.stringify({ confirm: true }) });
  if (!res.ok) throw new Error('Server error');
}

export async function sendAiMessage(message, history) {
  const res = await apiFetch('/ai/chat', {
    method: 'POST',
    body: JSON.stringify({ message, history }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI request failed');
  return data;
}

export async function parseWithAI(text) {
  const res = await apiFetch('/ai/parse', {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI request failed');
  return data;
}

export async function parseReceipt(imageData) {
  const res = await apiFetch('/ai/parse-receipt', {
    method: 'POST',
    body: JSON.stringify({ imageData }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'AI request failed');
  return data;
}

export async function getProfile() {
  const res = await apiFetch('/auth/me');
  if (!res.ok) throw new Error('Failed to load profile');
  return await res.json();
}
