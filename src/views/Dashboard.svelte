<script lang="ts">
  import { getExpense, getCurrentCurrency, addExpenseItem, removeExpenseItem, getDashboardTrendRange, setDashboardTrendRange, getCurrentSpaceId, confirmDialog } from '../lib/state.svelte.js';
  import { calculateSummary, calculateExpenseByCategory, calculateMemberBreakdown } from '../lib/calculations.svelte.js';
  import { calculateExpenseTrendData } from '../lib/utils.js';
  import { saveTransaction, deleteExpenseOnServer } from '../lib/api.js';
  import SummaryCards from '../components/SummaryCards.svelte';
  import BudgetOverview from '../components/BudgetOverview.svelte';
  import ExpenseForm from '../components/ExpenseForm.svelte';
  import PieChart from '../components/PieChart.svelte';
  import TrendChart from '../components/TrendChart.svelte';
  import ExpenseItem from '../components/ExpenseItem.svelte';
  import RecurringUpcoming from '../components/RecurringUpcoming.svelte';
  import MemberBreakdown from '../components/MemberBreakdown.svelte';

  let summary = $state({ income: 0, expenses: 0, balance: 0 });
  let categoryData = $state([]);
  let categoryTotal = $state(0);
  let trendPoints = $state([]);
  let trendTotal = $state(0);
  let trendAverage = $state(0);
  let trendPeriodLabel = $state('');
  let recentExpenses = $state([]);
  let trendRange = $state(getDashboardTrendRange());
  let memberData = $state([]);
  let memberTotal = $state(0);
  let inSpace = $derived(!!getCurrentSpaceId());

  async function refresh() {
    const expense = getExpense();
    const currency = getCurrentCurrency();
    const [s, c, t, m] = await Promise.all([
      calculateSummary(expense, currency),
      calculateExpenseByCategory(expense, currency),
      calculateExpenseTrendData(expense, trendRange, currency),
      calculateMemberBreakdown(expense, currency)
    ]);
    summary = s;
    categoryData = c.data;
    categoryTotal = c.total;
    trendPoints = t.points;
    trendTotal = t.total;
    trendAverage = t.average;
    trendPeriodLabel = t.periodLabel;
    recentExpenses = expense.slice(0, 10);
    memberData = m.data;
    memberTotal = m.total;
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

  async function handleDelete(id) {
    if (await confirmDialog('Delete this item?')) {
      await deleteExpenseOnServer(id);
      removeExpenseItem(id);
    }
  }
</script>

<div class="space-y-6">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <SummaryCards {summary} currency={getCurrentCurrency()} />
    <BudgetOverview />
  </div>

  <RecurringUpcoming />

  <ExpenseForm onadd={handleAdd} />

  <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <PieChart {categoryData} total={categoryTotal} currency={getCurrentCurrency()} />
    <TrendChart points={trendPoints} total={trendTotal} average={trendAverage} periodLabel={trendPeriodLabel} currency={getCurrentCurrency()} range={trendRange} onRangeChange={handleTrendChange} />
  </div>

  {#if inSpace}
    <MemberBreakdown {memberData} total={memberTotal} currency={getCurrentCurrency()} />
  {/if}

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
