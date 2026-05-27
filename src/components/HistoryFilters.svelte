<script>
  import { getExpense } from '../lib/state.svelte.js';

  let { searchQuery = $bindable(''), sortBy = $bindable('date'), sortDir = $bindable('desc'), filterType = $bindable('all') } = $props();

  let categories = $derived([...new Set(getExpense().map(i => i.category).filter(Boolean))]);
</script>

<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
  <div>
    <label class="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Search</label>
    <div class="relative">
      <i class="ph ph-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></i>
      <input type="text" bind:value={searchQuery} placeholder="Search expenses..."
        class="input-field w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none" />
    </div>
  </div>

  <div>
    <label class="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Type</label>
    <select bind:value={filterType}
      class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none appearance-none">
      <option value="all">All Types</option>
      <option value="income">Income Only</option>
      <option value="expense">Expense Only</option>
    </select>
  </div>

  <div>
    <label class="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Sort By</label>
    <select bind:value={sortBy}
      class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none appearance-none">
      <option value="date">Date</option>
      <option value="amount">Amount</option>
      <option value="category">Category</option>
    </select>
  </div>

  <div>
    <label class="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wider">Order</label>
    <select bind:value={sortDir}
      class="input-field w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-none appearance-none">
      <option value="desc">Newest / Highest</option>
      <option value="asc">Oldest / Lowest</option>
    </select>
  </div>
</div>
