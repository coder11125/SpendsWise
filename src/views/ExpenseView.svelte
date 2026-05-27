<script>
  import { getExpense, getCurrentCurrency, removeExpenseItem, getExpenseTrendRange, setExpenseTrendRange } from '../lib/state.svelte.js';
  import { calculateExpenseSummary, calculateExpenseByCategory } from '../lib/calculations.svelte.js';
  import { calculateExpenseTrendData } from '../lib/utils.js';
  import { getCurrencySymbol } from '../lib/currency.js';
  import { deleteExpenseOnServer } from '../lib/api.js';
  import PieChart from '../components/PieChart.svelte';
  import TopCategories from '../components/TopCategories.svelte';
  import TrendChart from '../components/TrendChart.svelte';
  import ExpenseItem from '../components/ExpenseItem.svelte';

  let summary = $state({ total: 0, count: 0, average: 0 });
  let categoryData = $state([]);
  let categoryTotal = $state(0);
  let trendPoints = $state([]);
  let trendTotal = $state(0);
  let trendAverage = $state(0);
  let trendPeriodLabel = $state('');
  let expenseItems = $state([]);
  let trendRange = $state(getExpenseTrendRange());

  async function refresh() {
    const expense = getExpense();
    const currency = getCurrentCurrency();
    expenseItems = expense.filter(i => i.type === 'expense');
    const [s, c, t] = await Promise.all([
      calculateExpenseSummary(expense, currency),
      calculateExpenseByCategory(expense, currency),
      calculateExpenseTrendData(expense, trendRange, currency)
    ]);
    summary = s;
    categoryData = c.data;
    categoryTotal = c.total;
    trendPoints = t.points;
    trendTotal = t.total;
    trendAverage = t.average;
    trendPeriodLabel = t.periodLabel;
  }

  $effect(() => {
    getExpense();
    getCurrentCurrency();
    trendRange;
    refresh();
  });

  function handleTrendChange(r) {
    trendRange = r;
    setExpenseTrendRange(r);
  }

  function handleEdit(item) {
    const ev = new CustomEvent('edit-expense', { detail: item });
    window.dispatchEvent(ev);
  }

  function handleDelete(id) {
    if (confirm('Delete this expense?')) {
      deleteExpenseOnServer(id);
      removeExpenseItem(id);
    }
  }
</script>

<div class="space-y-6">
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
      <p class="text-sm text-slate-500 dark:text-slate-400">Total Expenses</p>
      <p class="text-2xl font-bold text-rose-600">{getCurrencySymbol(getCurrentCurrency())}{summary.total.toFixed(2)}</p>
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
      <p class="text-sm text-slate-500 dark:text-slate-400">Expense Entries</p>
      <p class="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary.count}</p>
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
      <p class="text-sm text-slate-500 dark:text-slate-400">Average Expense</p>
      <p class="text-2xl font-bold text-orange-600">{getCurrencySymbol(getCurrentCurrency())}{summary.average.toFixed(2)}</p>
    </div>
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Expenses by Category</h2>
      <PieChart {categoryData} total={categoryTotal} currency={getCurrentCurrency()} />
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Top Categories</h2>
      <TopCategories {categoryData} total={categoryTotal} currency={getCurrentCurrency()} />
    </div>
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Expense Trend</h2>
      <div class="flex gap-1">
        {#each [{v:'day',l:'Day'},{v:'week',l:'Week'},{v:'month',l:'Month'},{v:'all',l:'All'}] as r}
          <button onclick={() => handleTrendChange(r.v)}
            class="px-3 py-1 text-xs rounded-lg font-medium transition-colors {trendRange === r.v ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}">{r.l}</button>
        {/each}
      </div>
    </div>
    <TrendChart points={trendPoints} total={trendTotal} average={trendAverage} periodLabel={trendPeriodLabel} currency={getCurrentCurrency()} />
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Expense Entries</h2>
    {#if expenseItems.length === 0}
      <p class="text-slate-500 dark:text-slate-400 text-center py-8">No expenses yet.</p>
    {:else}
      <ul class="space-y-2">
        {#each expenseItems as item (item.id)}
          <ExpenseItem {item}
            options={{
              showTypeBadge: false,
              useTypeIcon: true,
              iconBgClass: 'bg-rose-100',
              iconColorClass: 'text-rose-600',
              amountColorClass: 'text-rose-600',
              amountPrefix: '-'
            }}
            onedit={handleEdit}
            ondelete={handleDelete} />
        {/each}
      </ul>
    {/if}
  </div>
</div>
