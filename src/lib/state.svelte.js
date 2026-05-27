import { API_BASE, POLL_INTERVAL_MS } from './constants.js';

let _csrfToken = $state(null);
let _isLoggedIn = $state(false);
let _expense = $state([]);
let _currentCurrency = $state(localStorage.getItem('sw_currency') || 'USD');
let _familyMembers = $state([]);
let _currentFilter = $state('all');
let _dashboardTrendRange = $state('month');
let _expenseTrendRange = $state('month');
let _budgetGoals = $state(JSON.parse(localStorage.getItem('sw_budget_goals') || '{}'));
let _currencyRates = $state(JSON.parse(localStorage.getItem('sw_currency_rates') || '{}'));
let _lastRateFetch = $state(parseInt(localStorage.getItem('sw_last_rate_fetch') || '0', 10));
let _rateLimitHit = $state(localStorage.getItem('sw_rate_limit_hit') === 'true');
let _rateLimitHitTime = $state(parseInt(localStorage.getItem('sw_rate_limit_hit_time') || '0', 10));
let _aiChatHistory = $state([]);
let _email = $state(localStorage.getItem('sw_email') || '');
let _expenseChartData = $state([]);
let _expenseChartTotal = $state(0);
let _rateFetchAttempts = {};

let _currentView = $state('dashboard');
let _pollInterval = null;

export function getCsrfToken() { return _csrfToken; }
export function setCsrfToken(v) { _csrfToken = v; }

export function getIsLoggedIn() { return _isLoggedIn; }
export function setIsLoggedIn(v) { _isLoggedIn = v; }

export function getExpense() { return _expense; }
export function setExpense(v) { _expense = v; }
export function addExpenseItem(item) { _expense = [item, ..._expense]; }
export function removeExpenseItem(id) { _expense = _expense.filter(e => e.id !== id); }
export function updateExpenseItem(updated) {
  _expense = _expense.map(e => e.id === updated.id ? updated : e);
}

export function getCurrentCurrency() { return _currentCurrency; }
export function setCurrentCurrency(v) {
  _currentCurrency = v;
  localStorage.setItem('sw_currency', v);
}

export function getFamilyMembers() { return _familyMembers; }
export function setFamilyMembers(v) { _familyMembers = Array.isArray(v) ? [...v] : []; }

export function getCurrentFilter() { return _currentFilter; }
export function setCurrentFilter(v) { _currentFilter = v; }

export function getDashboardTrendRange() { return _dashboardTrendRange; }
export function setDashboardTrendRange(v) { _dashboardTrendRange = v; }

export function getExpenseTrendRange() { return _expenseTrendRange; }
export function setExpenseTrendRange(v) { _expenseTrendRange = v; }

export function getBudgetGoals() { return _budgetGoals; }
export function setBudgetGoals(v) {
  _budgetGoals = v;
  localStorage.setItem('sw_budget_goals', JSON.stringify(v));
}

export function getCurrencyRates() { return _currencyRates; }
export function setCurrencyRates(v) {
  _currencyRates = v;
  persistCurrencyState();
}

export function getLastRateFetch() { return _lastRateFetch; }
export function setLastRateFetch(v) { _lastRateFetch = v; }

export function getRateLimitHit() { return _rateLimitHit; }
export function setRateLimitHit(v) { _rateLimitHit = v; }

export function getRateLimitHitTime() { return _rateLimitHitTime; }
export function setRateLimitHitTime(v) { _rateLimitHitTime = v; }

export function getAiChatHistory() { return _aiChatHistory; }
export function setAiChatHistory(v) { _aiChatHistory = v; }

export function getEmail() { return _email; }
export function setEmail(v) {
  _email = v;
  localStorage.setItem('sw_email', v);
}

export function getExpenseChartData() { return _expenseChartData; }
export function setExpenseChartData(d, t) { _expenseChartData = d; _expenseChartTotal = t; }
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

export function startPolling() {
  stopPolling();
  _pollInterval = setInterval(() => {
    if (document.visibilityState === 'visible') {
      import('./api.js').then(m => m.loadExpenses());
    }
  }, POLL_INTERVAL_MS);
}

export function stopPolling() {
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
  }
}

function pathToView(path) {
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

export function navigate(path) {
  history.pushState({}, '', path);
  _currentView = pathToView(path);
}

export function getCurrentView() {
  return _currentView;
}
