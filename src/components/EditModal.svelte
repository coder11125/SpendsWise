<script lang="ts">
  import { onMount } from 'svelte';
  import { updateExpenseOnServer } from '../lib/api.js';
  import { updateExpenseItem, getFamilyMembers, getCurrentCurrency } from '../lib/state.svelte.js';
  import { categoryIcons } from '../lib/constants.js';

  let { expenseItem, onclose, onsaved } = $props();

  let type = $state('expense');
  let amount = $state(0);
  let category = $state('');
  let date = $state('');
  let familyMember = $state('');
  let note = $state('');
  let error = $state('');
  let loading = $state(false);

  let dateInput = $state(null);
  let fp = $state(null);

  const expenseCategories = ['Food & Dining', 'Housing', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Other'];
  const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other'];
  const categories = $derived(type === 'income' ? incomeCategories : expenseCategories);
  const familyMembers = $derived(getFamilyMembers());

  $effect(() => {
    if (expenseItem) {
      type = expenseItem.type;
      amount = expenseItem.amount;
      category = expenseItem.category;
      date = expenseItem.date;
      familyMember = expenseItem.familyMember || '';
      note = expenseItem.note || '';
      error = '';
    }
  });

  $effect(() => {
    if (dateInput && !fp) {
      import('flatpickr').then((mod) => {
        fp = mod.default(dateInput, {
          dateFormat: 'Y-m-d',
          disableMobile: true,
          defaultDate: date || 'today',
        });
      });
    }
  });

  async function handleSubmit(e) {
    e.preventDefault();
    if (!expenseItem) return;
    error = '';
    if (!type || Number.isNaN(amount) || !category || !date) {
      error = 'Please fill in all required fields.';
      return;
    }
    loading = true;
    try {
      const updated = await updateExpenseOnServer(expenseItem.id, { type, amount, category, date, familyMember, note, currency: getCurrentCurrency() });
      updateExpenseItem(updated);
      onsaved?.();
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

{#if expenseItem}
  <div role="presentation" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onclick={(e) => { if (e.target === e.currentTarget) onclose?.(); }}>
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-slate-800">Edit Expense</h2>
        <button aria-label="Close" onclick={() => onclose?.()} class="text-slate-400 hover:text-slate-600 transition-colors">
          <i class="ph ph-x text-xl"></i>
        </button>
      </div>

      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <label for="edit-type" class="block text-sm font-medium text-slate-700 mb-2">Type</label>
          <div class="flex gap-3">
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editType" value="expense" bind:group={type} class="text-rose-500 focus:ring-rose-500" />
              <span class="text-sm text-slate-700">Expense</span>
            </label>
            <label class="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="editType" value="income" bind:group={type} class="text-emerald-500 focus:ring-emerald-500" />
              <span class="text-sm text-slate-700">Income</span>
            </label>
          </div>
        </div>

        <div>
          <label for="editAmount" class="block text-sm font-medium text-slate-700 mb-1">Amount</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">$</span>
            <input
              id="editAmount"
              type="number"
              step="0.01"
              min="0"
              bind:value={amount}
              placeholder="0.00"
              class="w-full pl-8 pr-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>
        </div>

        <div>
          <label for="editCategory" class="block text-sm font-medium text-slate-700 mb-1">Category</label>
          <select
            id="editCategory"
            bind:value={category}
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="" disabled>Select category</option>
            {#each categories as cat}
              <option value={cat}>{cat}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="editDate" class="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            id="editDate"
            bind:this={dateInput}
            bind:value={date}
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label for="editFamilyMember" class="block text-sm font-medium text-slate-700 mb-1">Family Member</label>
          <select
            id="editFamilyMember"
            bind:value={familyMember}
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            <option value="">None / Myself</option>
            {#each familyMembers as member}
              <option value={member}>{member}</option>
            {/each}
          </select>
        </div>

        <div>
          <label for="editNote" class="block text-sm font-medium text-slate-700 mb-1">Note</label>
          <input
            id="editNote"
            type="text"
            bind:value={note}
            placeholder="Optional note..."
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        {#if error}
          <p class="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>
        {/if}

        <button
          type="submit"
          disabled={loading}
          class="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {#if loading}
            <i class="ph ph-spinner animate-spin"></i>
            Saving...
          {:else}
            <i class="ph ph-floppy-disk"></i>
            Save Changes
          {/if}
        </button>
      </form>
    </div>
  </div>
{/if}
