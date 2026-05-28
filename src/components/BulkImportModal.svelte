<script lang="ts">
  import { saveTransaction } from '../lib/api.js';
  import { getFamilyMembers } from '../lib/state.svelte.js';

  let { show, results, onclose, onsave } = $props();

  const expenseCategories = ['Food & Dining', 'Housing', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Gifts', 'Other'];
  const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other'];

  interface Item {
    type: string;
    amount: string;
    category: string;
    date: string;
    note: string;
    editing: boolean;
  }

  let items = $state<Item[]>([]);

  $effect(() => {
    if (show && results?.length) {
      const today = new Date().toISOString().split('T')[0];
      items = results.map((r: any) => ({
        type: r.type || 'expense',
        amount: r.amount != null ? String(r.amount) : '',
        category: r.category || 'Other',
        date: r.date || today,
        note: r.note || '',
        editing: false,
      }));
    }
  });

  let saving = $state(false);

  let categories = $derived.by(() => {
    const list = items.map((i) => i.type === 'expense' ? expenseCategories : incomeCategories);
    return list;
  });

  function availableCategories(type: string): string[] {
    return type === 'expense' ? expenseCategories : incomeCategories;
  }

  function toggleEdit(idx: number) {
    items[idx].editing = !items[idx].editing;
  }

  function removeItem(idx: number) {
    items = items.filter((_, i) => i !== idx);
  }

  function addBlank() {
    const today = new Date().toISOString().split('T')[0];
    items = [...items, {
      type: 'expense',
      amount: '',
      category: 'Food & Dining',
      date: today,
      note: '',
      editing: true,
    }];
  }

  function ensureValidCategory(item: Item) {
    const cats = availableCategories(item.type);
    if (!cats.includes(item.category)) {
      item.category = cats[0];
    }
  }

  async function saveAll() {
    saving = true;
    const saved: any[] = [];
    for (const item of items) {
      const amount = parseFloat(item.amount);
      if (isNaN(amount) || amount <= 0) continue;
      const result = await saveTransaction({
        type: item.type as 'income' | 'expense',
        amount,
        category: item.category,
        date: item.date,
        note: item.note,
      });
      if (result) saved.push(result);
    }
    saving = false;
    items = [];
    onsave?.(saved);
  }

  function handleOverlayClick(e: MouseEvent) {
    if (e.target === e.currentTarget) onclose?.();
  }
</script>

{#if show}
<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onclick={handleOverlayClick}>
  <div class="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
    <div class="flex items-center justify-between p-5 border-b border-slate-200 shrink-0">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
          <i class="ph ph-camera text-indigo-600 text-xl"></i>
        </div>
        <h2 class="text-lg font-bold text-slate-800">Import Receipts</h2>
      </div>
      <button onclick={() => onclose?.()} class="text-slate-400 hover:text-slate-600 transition-colors p-1">
        <i class="ph ph-x text-xl"></i>
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-5 space-y-3">
      {#each items as item, idx (idx)}
        <div class="border border-slate-200 rounded-xl p-4">
          {#if item.editing}
            <div class="space-y-3">
              <div class="flex gap-4">
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" bind:group={item.type} value="expense" onchange={() => ensureValidCategory(item)} class="text-rose-500 focus:ring-rose-400" />
                  <span class="text-sm text-slate-700">Expense</span>
                </label>
                <label class="flex items-center gap-2 cursor-pointer">
                  <input type="radio" bind:group={item.type} value="income" onchange={() => ensureValidCategory(item)} class="text-emerald-500 focus:ring-emerald-400" />
                  <span class="text-sm text-slate-700">Income</span>
                </label>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-500 mb-1 block">Amount</label>
                  <input type="number" step="0.01" bind:value={item.amount} placeholder="0.00" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label class="text-xs text-slate-500 mb-1 block">Category</label>
                  <select bind:value={item.category} class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {#each availableCategories(item.type) as cat}
                      <option value={cat}>{cat}</option>
                    {/each}
                  </select>
                </div>
              </div>
              <div class="grid grid-cols-2 gap-3">
                <div>
                  <label class="text-xs text-slate-500 mb-1 block">Date</label>
                  <input type="date" bind:value={item.date} class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label class="text-xs text-slate-500 mb-1 block">Note</label>
                  <input type="text" bind:value={item.note} placeholder="Optional" class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div class="flex gap-2 pt-1">
                <button onclick={() => toggleEdit(idx)} class="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  Done
                </button>
                <button onclick={() => removeItem(idx)} class="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">
                  <i class="ph ph-trash mr-1"></i>Remove
                </button>
              </div>
            </div>
          {:else}
            <div class="flex items-center justify-between">
              <div class="flex-1 grid grid-cols-5 gap-3 text-sm">
                <div>
                  <span class="text-xs text-slate-400 block">Type</span>
                  <span class="font-medium {item.type === 'expense' ? 'text-rose-600' : 'text-emerald-600'}">{item.type}</span>
                </div>
                <div>
                  <span class="text-xs text-slate-400 block">Amount</span>
                  <span class="font-semibold text-slate-800">{item.amount}</span>
                </div>
                <div>
                  <span class="text-xs text-slate-400 block">Category</span>
                  <span class="text-slate-700">{item.category}</span>
                </div>
                <div>
                  <span class="text-xs text-slate-400 block">Date</span>
                  <span class="text-slate-700">{item.date}</span>
                </div>
                <div>
                  <span class="text-xs text-slate-400 block">Note</span>
                  <span class="text-slate-700 truncate block">{item.note || '—'}</span>
                </div>
              </div>
              <div class="flex gap-1 ml-3 shrink-0">
                <button onclick={() => toggleEdit(idx)} class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Edit">
                  <i class="ph ph-pencil-simple-line text-lg"></i>
                </button>
                <button onclick={() => removeItem(idx)} class="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors" title="Delete">
                  <i class="ph ph-trash text-lg"></i>
                </button>
              </div>
            </div>
          {/if}
        </div>
      {/each}

      {#if items.length === 0}
        <div class="text-center py-12 text-slate-400">
          <i class="ph ph-receipt text-4xl mb-2 block"></i>
          <p class="text-sm">No items to import</p>
        </div>
      {/if}
    </div>

    <div class="border-t border-slate-200 p-4 shrink-0">
      <div class="flex items-center justify-between">
        <button onclick={addBlank} class="flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors px-3 py-1.5">
          <i class="ph ph-plus-circle text-lg"></i>
          Add
        </button>
        <div class="flex items-center gap-3">
          <span class="text-xs text-slate-400">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          <button
            onclick={saveAll}
            disabled={saving || items.length === 0}
            class="px-5 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {#if saving}
              <i class="ph ph-spinner animate-spin"></i>
              Saving...
            {:else}
              Add
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>
{/if}
