<script>
  import { getCurrencySymbol } from '../lib/currency.js';

  let { summary = { income: 0, expenses: 0, balance: 0 }, currency = 'USD' } = $props();

  let symbol = $derived(getCurrencySymbol(currency));

  function formatAmount(amount) {
    return `${symbol}${Math.abs(amount).toFixed(2)}`;
  }
</script>

<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in">
  <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-5 text-white">
    <div class="flex items-center justify-between mb-2">
      <p class="text-blue-100 text-sm font-medium">Total Balance</p>
      <div class="bg-white/20 p-2 rounded-lg">
        <i class="ph ph-wallet text-lg"></i>
      </div>
    </div>
    <p class="text-2xl font-bold">{formatAmount(summary.balance)}</p>
    <p class="text-blue-200 text-xs mt-1">{currency}</p>
  </div>

  <div class="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-sm p-5 text-white">
    <div class="flex items-center justify-between mb-2">
      <p class="text-emerald-100 text-sm font-medium">Total Income</p>
      <div class="bg-white/20 p-2 rounded-lg">
        <i class="ph ph-trend-up text-lg"></i>
      </div>
    </div>
    <p class="text-2xl font-bold">{formatAmount(summary.income)}</p>
    <p class="text-emerald-200 text-xs mt-1">{currency}</p>
  </div>

  <div class="bg-gradient-to-br from-rose-500 to-rose-600 rounded-xl shadow-sm p-5 text-white">
    <div class="flex items-center justify-between mb-2">
      <p class="text-rose-100 text-sm font-medium">Total Expense</p>
      <div class="bg-white/20 p-2 rounded-lg">
        <i class="ph ph-trend-down text-lg"></i>
      </div>
    </div>
    <p class="text-2xl font-bold">{formatAmount(summary.expenses)}</p>
    <p class="text-rose-200 text-xs mt-1">{currency}</p>
  </div>
</div>
