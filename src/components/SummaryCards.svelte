<script lang="ts">
  import { getCurrencySymbol } from '../lib/currency.js';

  let { summary = { income: 0, expenses: 0, balance: 0 }, currency = 'USD' } = $props();

  let symbol = $derived(getCurrencySymbol(currency));

  function formatAmount(amount, preserveSign = false) {
    const sign = preserveSign && amount < 0 ? '-' : '';
    return `${sign}${symbol}${Math.abs(amount).toFixed(2)}`;
  }
</script>

<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
    <div class="flex items-center justify-between mb-2">
      <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Balance</p>
      <div class="bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg">
        <i class="ph ph-wallet text-lg text-blue-600 dark:text-blue-400"></i>
      </div>
    </div>
    <p class="text-2xl font-bold {summary.balance < 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}">{formatAmount(summary.balance, true)}</p>
    <p class="text-slate-400 dark:text-slate-500 text-xs mt-1">{currency}</p>
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
    <div class="flex items-center justify-between mb-2">
      <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Income</p>
      <div class="bg-emerald-50 dark:bg-emerald-900/30 p-2 rounded-lg">
        <i class="ph ph-trend-up text-lg text-emerald-600 dark:text-emerald-400"></i>
      </div>
    </div>
    <p class="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatAmount(summary.income)}</p>
    <p class="text-slate-400 dark:text-slate-500 text-xs mt-1">{currency}</p>
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
    <div class="flex items-center justify-between mb-2">
      <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">Total Expense</p>
      <div class="bg-rose-50 dark:bg-rose-900/30 p-2 rounded-lg">
        <i class="ph ph-trend-down text-lg text-rose-600 dark:text-rose-400"></i>
      </div>
    </div>
    <p class="text-2xl font-bold text-rose-600 dark:text-rose-400">{formatAmount(summary.expenses)}</p>
    <p class="text-slate-400 dark:text-slate-500 text-xs mt-1">{currency}</p>
  </div>
</div>
