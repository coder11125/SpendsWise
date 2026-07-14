<script lang="ts">
  import { onMount } from 'svelte';
  import { saveTransaction } from '../lib/api.js';
  import { addExpenseItem, getFamilyMembers, getCurrentCurrency } from '../lib/state.svelte.js';
  import { getCurrencySymbol } from '../lib/currency.js';
  import CategorySelect from './CategorySelect.svelte';

  let { show, onclose } = $props();

  const currencySymbol = $derived(getCurrencySymbol(getCurrentCurrency()));

  let type = $state('expense');
  let amount = $state(0);
  let category = $state('');
  let date = $state(new Date().toISOString().split('T')[0]);
  let familyMember = $state('');
  let note = $state('');
  let loading = $state(false);
  let error = $state('');

  let dateInput = $state(null);
  let fp = $state(null);

  const familyMembers = $derived(getFamilyMembers());

  $effect(() => {
    if (dateInput && !fp) {
      import('flatpickr').then((mod) => {
        fp = mod.default(dateInput, {
          dateFormat: 'Y-m-d',
          altInput: true,
          altFormat: 'd/m/Y',
          disableMobile: true,
          defaultDate: date || 'today',
        });
      });
    }
  });

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    if (!type || Number.isNaN(amount) || !category || !date) {
      error = 'Please fill in all required fields.';
      return;
    }
    loading = true;
    try {
      const entry = await saveTransaction({ type, amount, category, date, familyMember, note });
      if (entry) {
        addExpenseItem(entry);
        type = 'expense';
        amount = 0;
        category = '';
        date = new Date().toISOString().split('T')[0];
        familyMember = '';
        note = '';
        onclose?.();
      } else {
        error = 'Failed to save expense.';
      }
    } catch (err) {
      error = 'Network error. Please try again.';
    } finally {
      loading = false;
    }
  }
</script>

{#if show}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onclick={(e) => { if (e.target === e.currentTarget) onclose?.(); }}>
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-slate-800">Quick Add</h2>
        <button onclick={() => onclose?.()} class="text-slate-400 hover:text-slate-600 transition-colors">
          <i class="ph ph-x text-xl"></i>
        </button>
      </div>

      <form onsubmit={handleSubmit} class="space-y-4">
        <div class="flex gap-3">
          <label class="flex-1 flex items-center justify-center gap-2 cursor-pointer border {type === 'expense' ? 'border-rose-300 bg-rose-50' : 'border-slate-200'} rounded-lg py-2.5 transition-colors">
            <input type="radio" name="mqType" value="expense" bind:group={type} class="sr-only" />
            <i class="ph ph-trend-down {type === 'expense' ? 'text-rose-600' : 'text-slate-400'}"></i>
            <span class="text-sm font-medium {type === 'expense' ? 'text-rose-600' : 'text-slate-600'}">Expense</span>
          </label>
          <label class="flex-1 flex items-center justify-center gap-2 cursor-pointer border {type === 'income' ? 'border-emerald-300 bg-emerald-50' : 'border-slate-200'} rounded-lg py-2.5 transition-colors">
            <input type="radio" name="mqType" value="income" bind:group={type} class="sr-only" />
            <i class="ph ph-trend-up {type === 'income' ? 'text-emerald-600' : 'text-slate-400'}"></i>
            <span class="text-sm font-medium {type === 'income' ? 'text-emerald-600' : 'text-slate-600'}">Income</span>
          </label>
        </div>

        <div>
          <label for="mqAmount" class="block text-sm font-medium text-slate-700 mb-1">Amount</label>
          <div class="relative">
            <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-medium">{currencySymbol}</span>
            <input
              id="mqAmount"
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
          <label for="mqCategory" class="block text-sm font-medium text-slate-700 mb-1">Type</label>
          <CategorySelect
            id="mqCategory"
            type={type}
            bind:value={category}
            selectClass="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label for="mqDate" class="block text-sm font-medium text-slate-700 mb-1">Date</label>
          <input
            id="mqDate"
            bind:this={dateInput}
            bind:value={date}
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>

        <div>
          <label for="mqFamilyMember" class="block text-sm font-medium text-slate-700 mb-1">Family Member</label>
          <select
            id="mqFamilyMember"
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
          <label for="mqNote" class="block text-sm font-medium text-slate-700 mb-1">Note</label>
          <input
            id="mqNote"
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
            Adding...
          {:else}
            <i class="ph ph-plus-circle"></i>
            Add Entry
          {/if}
        </button>
      </form>
    </div>
  </div>
{/if}
