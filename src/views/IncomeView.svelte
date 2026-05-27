<script>
  import { getExpense, getCurrentCurrency, removeExpenseItem } from '../lib/state.svelte.js';
  import { calculateIncomeSummary } from '../lib/calculations.svelte.js';
  import { getCurrencySymbol } from '../lib/currency.js';
  import { deleteExpenseOnServer } from '../lib/api.js';
  import ExpenseItem from '../components/ExpenseItem.svelte';

  let summary = $state({ total: 0, count: 0, average: 0 });
  let incomeItems = $state([]);

  async function refresh() {
    const expense = getExpense();
    const currency = getCurrentCurrency();
    incomeItems = expense.filter(i => i.type === 'income');
    summary = await calculateIncomeSummary(expense, currency);
  }

  $effect(() => {
    getExpense();
    getCurrentCurrency();
    refresh();
  });

  function handleEdit(item) {
    const ev = new CustomEvent('edit-income', { detail: item });
    window.dispatchEvent(ev);
  }

  function handleDelete(id) {
    if (confirm('Delete this income entry?')) {
      deleteExpenseOnServer(id);
      removeExpenseItem(id);
    }
  }
</script>

<div class="space-y-6">
  <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
      <p class="text-sm text-slate-500 dark:text-slate-400">Total Income</p>
      <p class="text-2xl font-bold text-emerald-600">{getCurrencySymbol(getCurrentCurrency())}{summary.total.toFixed(2)}</p>
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
      <p class="text-sm text-slate-500 dark:text-slate-400">Income Entries</p>
      <p class="text-2xl font-bold text-slate-800 dark:text-slate-100">{summary.count}</p>
    </div>
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
      <p class="text-sm text-slate-500 dark:text-slate-400">Average Income</p>
      <p class="text-2xl font-bold text-blue-600">{getCurrencySymbol(getCurrentCurrency())}{summary.average.toFixed(2)}</p>
    </div>
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Income Entries</h2>
    {#if incomeItems.length === 0}
      <p class="text-slate-500 dark:text-slate-400 text-center py-8">No income entries yet.</p>
    {:else}
      <ul class="space-y-2">
        {#each incomeItems as item (item.id)}
          <ExpenseItem {item}
            options={{
              showTypeBadge: false,
              useTypeIcon: true,
              iconBgClass: 'bg-emerald-100',
              iconColorClass: 'text-emerald-600',
              amountColorClass: 'text-emerald-600',
              amountPrefix: '+'
            }}
            onedit={handleEdit}
            ondelete={handleDelete} />
        {/each}
      </ul>
    {/if}
  </div>
</div>
