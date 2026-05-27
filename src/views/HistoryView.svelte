<script>
  import { getExpense, getCurrentCurrency, removeExpenseItem, getCurrentFilter, setCurrentFilter } from '../lib/state.svelte.js';
  import { deleteExpenseOnServer } from '../lib/api.js';
  import ExpenseItem from '../components/ExpenseItem.svelte';
  let allItems = $state([]);
  let displayedItems = $state([]);
  let searchQuery = $state('');
  let sortBy = $state('date');
  let sortDir = $state('desc');
  let filterType = $state(getCurrentFilter());

  let categories = $derived([...new Set(allItems.map(i => i.category).filter(Boolean))]);

  $effect(() => {
    const expense = getExpense();
    getCurrentCurrency();
    allItems = [...expense];
    applyFilters();
  });

  $effect(() => {
    searchQuery;
    sortBy;
    sortDir;
    filterType;
    applyFilters();
  });

  function applyFilters() {
    let items = [...allItems];

    if (filterType !== 'all') {
      items = items.filter(i => i.type === filterType);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(i =>
        (i.category && i.category.toLowerCase().includes(q)) ||
        (i.note && i.note.toLowerCase().includes(q)) ||
        (i.familyMember && i.familyMember.toLowerCase().includes(q))
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

  function handleEdit(item) {
    const ev = new CustomEvent('edit-item', { detail: item });
    window.dispatchEvent(ev);
  }

  function handleDelete(id) {
    if (confirm('Delete this item?')) {
      deleteExpenseOnServer(id);
      removeExpenseItem(id);
    }
  }

  function toggleSort(field) {
    if (sortBy === field) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortBy = field;
      sortDir = 'desc';
    }
  }
</script>

<div class="space-y-4">

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <div class="flex flex-col sm:flex-row gap-4 mb-4">
      <div class="relative flex-1">
        <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
        <input type="text" placeholder="Search by category, note, or family member..."
          bind:value={searchQuery}
          class="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500" />
      </div>
      <div class="flex gap-2 items-center">
        <span class="text-sm text-slate-500 dark:text-slate-400">Sort by:</span>
        {#each [{k:'date',l:'Date'},{k:'amount',l:'Amount'},{k:'category',l:'Category'}] as opt}
          <button onclick={() => toggleSort(opt.k)}
            class="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors {sortBy === opt.k ? 'bg-rose-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}">
            {opt.l}
            {#if sortBy === opt.k}
              <i class="ph ph-caret-{sortDir === 'asc' ? 'up' : 'down'}"></i>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    {#if displayedItems.length > 0}
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">{displayedItems.length} item{displayedItems.length !== 1 ? 's' : ''}</p>
    {/if}

    {#if displayedItems.length === 0}
      <p class="text-slate-500 dark:text-slate-400 text-center py-8">No matching items found.</p>
    {:else}
      <ul class="space-y-2">
        {#each displayedItems as item (item.id)}
          <ExpenseItem {item}
            options={{
              showTypeBadge: true,
              useTypeIcon: false,
              iconBgClass: item.type === 'income' ? 'bg-emerald-100' : 'bg-rose-100',
              iconColorClass: item.type === 'income' ? 'text-emerald-600' : 'text-rose-600',
              amountColorClass: item.type === 'income' ? 'text-emerald-600' : 'text-rose-600',
              amountPrefix: item.type === 'income' ? '+' : ''
            }}
            onedit={handleEdit}
            ondelete={handleDelete} />
        {/each}
      </ul>
    {/if}
  </div>
</div>
