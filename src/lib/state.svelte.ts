import { API_BASE, POLL_INTERVAL_MS } from './constants.js';
import type { Expense, CurrencyRates, CategoryData } from '../types.js';

let _csrfToken = $state<string | null>(null);
let _isLoggedIn = $state<boolean>(false);
let _userId = $state<string | null>(null);
let _expense = $state<Expense[]>([]);
let _currentCurrency = $state<string>(localStorage.getItem('sw_currency') || 'USD');
let _familyMembers = $state<any[]>([]);
let _currentFilter = $state<string>('all');
let _dashboardTrendRange = $state<string>('month');
let _expenseTrendRange = $state<string>('month');
let _budgetGoals = $state<Record<string, number>>(JSON.parse(localStorage.getItem('sw_budget_goals') || '{}'));
let _currencyRates = $state<CurrencyRates>(JSON.parse(localStorage.getItem('sw_currency_rates') || '{}'));
let _lastRateFetch = $state<number>(parseInt(localStorage.getItem('sw_last_rate_fetch') || '0', 10));
let _rateLimitHit = $state<boolean>(localStorage.getItem('sw_rate_limit_hit') === 'true');
let _rateLimitHitTime = $state<number>(parseInt(localStorage.getItem('sw_rate_limit_hit_time') || '0', 10));
let _aiChatHistory = $state<any[]>([]);
let _email = $state<string>(localStorage.getItem('sw_email') || '');
let _expenseChartData = $state<CategoryData[]>([]);
let _expenseChartTotal = $state<number>(0);
let _rateFetchAttempts: Record<string, number> = {};

let _currentView = $state<string>('dashboard');
let _pollInterval: any = null;
let _pusher: any = null;

export function getCsrfToken() { return _csrfToken; }
export function setCsrfToken(v: string | null) { _csrfToken = v; }

export function getIsLoggedIn() { return _isLoggedIn; }
export function setIsLoggedIn(v: boolean) { _isLoggedIn = v; }

export function getUserId() { return _userId; }
export function setUserId(v: string | null) { _userId = v; }

export function getExpense() { return _expense; }
export function setExpense(v: Expense[]) { _expense = v; }
export function addExpenseItem(item: Expense) { _expense = [item, ..._expense]; }
export function removeExpenseItem(id: string) { _expense = _expense.filter(e => e.id !== id); }
export function updateExpenseItem(updated: Expense) {
  _expense = _expense.map(e => e.id === updated.id ? updated : e);
}

export function getCurrentCurrency() { return _currentCurrency; }
export function setCurrentCurrency(v: string) {
  _currentCurrency = v;
  localStorage.setItem('sw_currency', v);
}

export function getFamilyMembers() { return _familyMembers; }
export function setFamilyMembers(v: any[]) { _familyMembers = Array.isArray(v) ? [...v] : []; }

export function getCurrentFilter() { return _currentFilter; }
export function setCurrentFilter(v: string) { _currentFilter = v; }

export function getDashboardTrendRange() { return _dashboardTrendRange; }
export function setDashboardTrendRange(v: string) { _dashboardTrendRange = v; }

export function getExpenseTrendRange() { return _expenseTrendRange; }
export function setExpenseTrendRange(v: string) { _expenseTrendRange = v; }

export function getBudgetGoals() { return _budgetGoals; }
export function setBudgetGoals(v: Record<string, number>) {
  _budgetGoals = v;
  localStorage.setItem('sw_budget_goals', JSON.stringify(v));
}

export function getCurrencyRates() { return _currencyRates; }
export function setCurrencyRates(v: CurrencyRates) {
  _currencyRates = v;
  persistCurrencyState();
}

export function getLastRateFetch() { return _lastRateFetch; }
export function setLastRateFetch(v: number) { _lastRateFetch = v; }

export function getRateLimitHit() { return _rateLimitHit; }
export function setRateLimitHit(v: boolean) { _rateLimitHit = v; }

export function getRateLimitHitTime() { return _rateLimitHitTime; }
export function setRateLimitHitTime(v: number) { _rateLimitHitTime = v; }

export function getAiChatHistory() { return _aiChatHistory; }
export function setAiChatHistory(v: any[]) { _aiChatHistory = v; }

export function getEmail() { return _email; }
export function setEmail(v: string) {
  _email = v;
  localStorage.setItem('sw_email', v);
}

export function getExpenseChartData() { return _expenseChartData; }
export function setExpenseChartData(d: CategoryData[], t: number) { _expenseChartData = d; _expenseChartTotal = t; }
export function getExpenseChartTotal() { return _expenseChartTotal; }

export function getRateFetchAttempts() { return _rateFetchAttempts; }

function persistCurrencyState() {
  try {
    localStorage.setItem('sw_currency_rates', JSON.stringify(_currencyRates));
    localStorage.setItem('sw_last_rate_fetch', _lastRateFetch.toString());
    localStorage.setItem('sw_rate_limit_hit', _rateLimitHit.toString());
    localStorage.setItem('sw_rate_limit_hit_time', _rateLimitHitTime.toString());
  } catch (e) {
    console.warn('Could not save currency rates to localStorage:', e);
  }
}

setInterval(persistCurrencyState, 30000);

export function initPusher(userId: string): void {
  destroyPusher();
  const key = import.meta.env.VITE_PUSHER_KEY;
  const cluster = import.meta.env.VITE_PUSHER_CLUSTER || 'ap1';
  if (!key) return;
  import('pusher-js').then(({ default: Pusher }) => {
    _pusher = new Pusher(key, { cluster });
    const channel = _pusher.subscribe(`user-${userId}`);
    channel.bind('data-changed', () => {
      import('./api.js').then(m => m.loadExpenses());
    });
  });
}

function destroyPusher(): void {
  if (_pusher) {
    _pusher.disconnect();
    _pusher = null;
  }
}

export function startPolling() {
  stopPolling();
  _pollInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      import('./api.js').then(m => m.loadExpenses());
    }
  }, POLL_INTERVAL_MS);
}

export function stopPolling() {
  destroyPusher();
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
}

function pathToView(path: string) {
  const route = path.replace(/^\//, '') || 'dashboard';
  return ['dashboard', 'income', 'expense', 'account'].includes(route) ? route : 'dashboard';
}

export function initRouter() {
  let p = window.location.pathname.replace(/\/+$/, '') || '/';
  if (p === '/' || p === '') {
    history.replaceState({}, '', '/dashboard');
    p = '/dashboard';
  }
  _currentView = pathToView(p);
  window.addEventListener('popstate', () => {
    let p = window.location.pathname.replace(/\/+$/, '') || '/';
    _currentView = pathToView(p);
  });
}

export function navigate(path: string) {
  history.pushState({}, '', path);
  _currentView = pathToView(path);
}

export function getCurrentView() {
  return _currentView;
}
