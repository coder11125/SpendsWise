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

  // Recurrence state
  let hasRecurrence = $state(false);
  let recurrenceFrequency = $state('monthly');
  let recurrenceEndDate = $state('');

  let dateInput = $state(null);
  let endDateInput = $state(null);
  let fp = $state(null);
  let endDateFp = $state(null);

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
      hasRecurrence = !!expenseItem.recurrence;
      recurrenceFrequency = expenseItem.recurrence?.frequency || 'monthly';
      recurrenceEndDate = expenseItem.recurrence?.endDate || '';
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
    if (endDateInput && hasRecurrence && !endDateFp) {
      import('flatpickr').then((mod) => {
        endDateFp = mod.default(endDateInput, {
          dateFormat: 'Y-m-d',
          disableMobile: true,
          defaultDate: recurrenceEndDate || undefined,
          onChange: (selectedDates) => {
            if (selectedDates[0]) {
              recurrenceEndDate = selectedDates[0].toISOString().split('T')[0];
            }
          }
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
      let recurrence = undefined;
      if (hasRecurrence) {
        recurrence = {
          frequency: recurrenceFrequency,
          nextDueDate: expenseItem.recurrence?.nextDueDate || date,
          endDate: recurrenceEndDate || null,
          isActive: expenseItem.recurrence?.isActive ?? true,
        };
      } else if (expenseItem.recurrence) {
        // User turned off recurrence
        recurrence = null;
      }

      const updated = await updateExpenseOnServer(expenseItem.id, {
        type, amount, category, date, familyMember, note, currency: getCurrentCurrency(),
        recurrence,
      });
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

        <!-- Recurrence -->
        <div class="bg-slate-50 rounded-lg p-4 border border-slate-200">
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <i class="ph ph-repeat text-purple-600"></i>
              <span class="text-sm font-medium text-slate-700">Recurring Transaction</span>
            </div>
            <button type="button" onclick={() => hasRecurrence = !hasRecurrence}
              class="relative w-10 h-5 rounded-full transition-colors {hasRecurrence ? 'bg-purple-600' : 'bg-slate-300'}">
              <div class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform {hasRecurrence ? 'translate-x-5' : ''}"></div>
            </button>
          </div>
          {#if hasRecurrence}
            <div class="space-y-3 mt-3 animate-fade-in">
              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">Frequency</label>
                <div class="flex gap-1">
                  {#each [
                    { v: 'daily', l: 'Daily' },
                    { v: 'weekly', l: 'Weekly' },
                    { v: 'biweekly', l: 'Bi-weekly' },
                    { v: 'monthly', l: 'Monthly' },
                    { v: 'yearly', l: 'Yearly' }
                  ] as opt}
                    <button type="button" onclick={() => recurrenceFrequency = opt.v}
                      class="px-2.5 py-1 text-xs rounded-md font-medium transition-colors {recurrenceFrequency === opt.v ? 'bg-purple-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-200'}">
                      {opt.l}
                    </button>
                  {/each}
                </div>
              </div>
              <div>
                <label class="block text-xs font-medium text-slate-500 mb-1">End Date (optional)</label>
                <input bind:this={endDateInput} type="text" bind:value={recurrenceEndDate} placeholder="No end date"
                  class="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-md text-slate-800 text-xs focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
          {/if}
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
