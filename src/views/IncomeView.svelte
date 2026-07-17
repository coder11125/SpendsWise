<script lang="ts">
  import { getExpense, getCurrentCurrency, removeExpenseItem, getCurrentSpaceId, confirmDialog } from '../lib/state.svelte.js';
  import { calculateIncomeSummary, calculateMemberBreakdown } from '../lib/calculations.svelte.js';
  import { getCurrencySymbol } from '../lib/currency.js';
  import { deleteExpenseOnServer } from '../lib/api.js';
  import ExpenseItem from '../components/ExpenseItem.svelte';
  import MemberBreakdown from '../components/MemberBreakdown.svelte';

  let summary = $state({ total: 0, count: 0, average: 0 });
  let incomeItems = $state([]);
  let displayedItems = $state([]);
  let searchQuery = $state('');
  let sortBy = $state('date');
  let sortDir = $state('desc');
  let memberData = $state([]);
  let memberTotal = $state(0);
  let inSpace = $derived(!!getCurrentSpaceId());

  async function refresh() {
    const expense = getExpense();
    const currency = getCurrentCurrency();
    incomeItems = expense.filter(i => i.type === 'income');
    summary = await calculateIncomeSummary(expense, currency);
    const m = await calculateMemberBreakdown(incomeItems, currency);
    memberData = m.data;
    memberTotal = m.total;
    applyFilters();
  }

  function applyFilters() {
    let items = [...incomeItems];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i =>
        (i.category && i.category.toLowerCase().includes(q)) ||
        (i.note && i.note.toLowerCase().includes(q)) ||
        (i.familyMember && i.familyMember.toLowerCase().includes(q)) ||
        (i.authorNickname && i.authorNickname.toLowerCase().includes(q))
      );
    }

    items.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'date') {
        cmp = a.date.localeCompare(b.date);
      } else if (sortBy === 'amount') {
        cmp = a.amount - b.amount;
      } else if (sortBy === 'category') {
        cmp = (a.category || '').localeCompare(b.category || '');
      }
      return sortDir === 'desc' ? -cmp : cmp;
    });

    displayedItems = items;
  }

  $effect(() => {
    getExpense();
    getCurrentCurrency();
    refresh();
  });

  $effect(() => {
    searchQuery;
    sortBy;
    sortDir;
    applyFilters();
  });

  function toggleSort(field) {
    if (sortBy === field) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = field;
      sortDir = 'desc';
    }
  }

  function handleEdit(item) {
    const ev = new CustomEvent('edit-income', { detail: item });
    window.dispatchEvent(ev);
  }

  async function handleDelete(id) {
    if (await confirmDialog('Delete this income entry?')) {
      const deleted = await deleteExpenseOnServer(id);
      if (deleted) {
        removeExpenseItem(id);
      } else {
        alert('Unable to delete this income entry. Please try again.');
      }
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

  {#if inSpace}
    <MemberBreakdown {memberData} total={memberTotal} currency={getCurrentCurrency()} />
  {/if}

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Income Entries</h2>
      <div class="flex flex-col sm:flex-row gap-3 flex-1 sm:justify-end">
        <div class="relative max-w-xs w-full">
          <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
          <input type="text" placeholder="Search income..."
            bind:value={searchQuery}
            class="w-full pl-9 pr-4 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div class="flex gap-1">
          {#each [{k:'date',l:'Date'},{k:'amount',l:'Amount'}] as opt}
            <button onclick={() => toggleSort(opt.k)}
              class="px-3 py-2 text-xs rounded-lg font-medium transition-colors {sortBy === opt.k ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}">
              {opt.l}
              {#if sortBy === opt.k}
                <i class="ph ph-caret-{sortDir === 'asc' ? 'up' : 'down'} ml-1"></i>
              {/if}
            </button>
          {/each}
        </div>
      </div>
    </div>

    {#if displayedItems.length === 0}
      <p class="text-slate-500 dark:text-slate-400 text-center py-8">{searchQuery ? 'No matching income found.' : 'No income entries yet.'}</p>
    {:else}
      <ul class="space-y-2">
        {#each displayedItems as item (item.id)}
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
