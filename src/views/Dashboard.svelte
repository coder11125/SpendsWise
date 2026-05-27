<script lang="ts">
  import { getExpense, getCurrentCurrency, addExpenseItem, removeExpenseItem, getDashboardTrendRange, setDashboardTrendRange } from '../lib/state.svelte.js';
  import { calculateSummary, calculateExpenseByCategory } from '../lib/calculations.svelte.js';
  import { calculateExpenseTrendData } from '../lib/utils.js';
  import { saveTransaction, deleteExpenseOnServer } from '../lib/api.js';
  import SummaryCards from '../components/SummaryCards.svelte';
  import BudgetOverview from '../components/BudgetOverview.svelte';
  import ExpenseForm from '../components/ExpenseForm.svelte';
  import PieChart from '../components/PieChart.svelte';
  import TrendChart from '../components/TrendChart.svelte';
  import ExpenseItem from '../components/ExpenseItem.svelte';

  let summary = $state({ income: 0, expenses: 0, balance: 0 });
  let categoryData = $state([]);
  let categoryTotal = $state(0);
  let trendPoints = $state([]);
  let trendTotal = $state(0);
  let trendAverage = $state(0);
  let trendPeriodLabel = $state('');
  let recentExpenses = $state([]);
  let trendRange = $state(getDashboardTrendRange());

  async function refresh() {
    const expense = getExpense();
    const currency = getCurrentCurrency();
    const [s, c, t] = await Promise.all([
      calculateSummary(expense, currency),
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
    recentExpenses = expense.slice(0, 10);
  }

  $effect(() => {
    getExpense();
    getCurrentCurrency();
    trendRange;
    refresh();
  });

  function handleTrendChange(r) {
    trendRange = r;
    setDashboardTrendRange(r);
  }

  async function handleAdd(saved) {
    if (saved) addExpenseItem(saved);
  }

  function handleDelete(id) {
    if (confirm('Delete this item?')) {
      deleteExpenseOnServer(id);
      removeExpenseItem(id);
    }
  }
</script>

<div class="space-y-6">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <SummaryCards {summary} currency={getCurrentCurrency()} />
    <BudgetOverview />
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Add Transaction</h2>
    <ExpenseForm onadd={handleAdd} />
  </div>

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Expenses by Category</h2>
      <PieChart {categoryData} total={categoryTotal} currency={getCurrentCurrency()} />
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
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Recent Expenses</h2>
    {#if recentExpenses.length === 0}
      <p class="text-slate-500 dark:text-slate-400 text-center py-8">No expenses yet.</p>
    {:else}
      <ul class="space-y-2">
        {#each recentExpenses as item (item.id)}
          <ExpenseItem {item}
            options={{
              showTypeBadge: true,
              useTypeIcon: false,
              iconBgClass: item.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100',
              iconColorClass: item.type === 'income' ? 'text-emerald-600' : 'text-rose-600',
              amountColorClass: item.type === 'income' ? 'text-emerald-600' : 'text-rose-600',
              amountPrefix: item.type === 'income' ? '+' : ''
            }}
            onedit={() => {}}
            ondelete={handleDelete} />
        {/each}
      </ul>
    {/if}
  </div>
</div>
