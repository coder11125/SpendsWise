<script lang="ts">
  import { onMount } from 'svelte';
  import flatpickr from 'flatpickr';
  import { saveTransaction, parseWithAI, parseReceiptsBulk } from '../lib/api.js';
  import { getFamilyMembers } from '../lib/state.svelte.js';
  import { compressImageToDataUrl } from '../lib/utils.js';
  import BulkImportModal from './BulkImportModal.svelte';

  let { onadd } = $props();

  let type = $state('expense');
  let amount = $state('');
  let category = $state('Food & Dining');
  let date = $state(new Date().toISOString().split('T')[0]);
  let familyMember = $state('');
  let note = $state('');
  let submitting = $state(false);
  let fpInstance = $state(null);
  let dateInputEl;

  let aiText = $state('');
  let aiProcessing = $state(false);
  let receiptProcessing = $state(false);
  let receiptProgress = $state('');
  let parsedReceipts = $state<any[]>([]);
  let showBulkModal = $state(false);

  const expenseCategories = ['Food & Dining', 'Housing', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Gifts', 'Other'];
  const incomeCategories = ['Salary', 'Freelance', 'Investments', 'Gifts', 'Other'];

  let categories = $derived(type === 'expense' ? expenseCategories : incomeCategories);
  let familyMembers = $derived(getFamilyMembers());

  $effect(() => {
    if (categories.length > 0 && !categories.includes(category)) {
      category = categories[0];
    }
  });

  onMount(() => {
    if (dateInputEl) {
      fpInstance = flatpickr(dateInputEl, {
        dateFormat: 'Y-m-d',
        defaultDate: date,
        onChange: (selectedDates) => {
          if (selectedDates[0]) {
            date = selectedDates[0].toISOString().split('T')[0];
          }
        }
      });
    }
    return () => {
      fpInstance?.destroy();
    };
  });

  async function handleSubmit() {
    if (!type || !amount || !category || !date) return;
    submitting = true;
    const result = await saveTransaction({
      type,
      amount: parseFloat(amount),
      category,
      date,
      familyMember,
      note,
    });
    submitting = false;
    if (result) {
      amount = '';
      note = '';
      familyMember = '';
      date = new Date().toISOString().split('T')[0];
      if (fpInstance) fpInstance.setDate(date);
      onadd?.(result);
    }
  }

  async function handleAiQuickAdd() {
    if (!aiText.trim()) return;
    aiProcessing = true;
    try {
      const data = await parseWithAI(aiText);
      if (data) {
        if (data.type) type = data.type;
        if (data.amount != null) amount = String(data.amount);
        if (data.category) category = data.category;
        if (data.date) {
          date = data.date;
          if (fpInstance) fpInstance.setDate(date);
        }
        if (data.familyMember) familyMember = data.familyMember;
        if (data.note) note = data.note;
      }
    } catch (err) {
      console.error('AI parse failed:', err);
    }
    aiProcessing = false;
    aiText = '';
  }

  async function handleBulkReceiptUpload(e) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    receiptProcessing = true;
    receiptProgress = `Compressing ${files.length} receipt${files.length > 1 ? 's' : ''}...`;
    const dataUrls = await Promise.all(
      files.map((f) => compressImageToDataUrl(f, 1920, 0.7))
    );
    receiptProgress = `Processing ${dataUrls.length} receipt${dataUrls.length > 1 ? 's' : ''}...`;
    try {
      const data = await parseReceiptsBulk(dataUrls);
      receiptProgress = '';
      const flat: any[] = [];
      const today = new Date().toISOString().split('T')[0];
      for (const r of data.results ?? []) {
        if (r.error) continue;
        for (const item of r.items ?? []) {
          flat.push({
            type: item.type || 'expense',
            amount: item.amount,
            category: item.category || 'Other',
            date: r.date || today,
            note: item.name || item.note || '',
          });
        }
      }
      if (flat.length > 0) {
        parsedReceipts = flat;
        showBulkModal = true;
      } else {
        alert('Could not extract data from any of the receipts.');
      }
    } catch (err) {
      console.error('Bulk receipt parse failed:', err);
      receiptProgress = '';
      alert('Failed to process receipts. Please try again.');
    }
    receiptProcessing = false;
    e.target.value = '';
  }

  function handleBulkSave(saved: any[]) {
    showBulkModal = false;
    parsedReceipts = [];
    for (const item of saved) {
      onadd?.(item);
    }
  }

  let receiptInput;

  function triggerReceiptUpload() {
    receiptInput?.click();
  }
</script>

<div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 animate-fade-in">
  <div class="flex items-center gap-2 mb-6">
    <i class="ph ph-plus-circle text-xl text-blue-600"></i>
    <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Add Transaction</h2>
  </div>

  <div class="flex gap-4 mb-4">
    <label class="flex items-center gap-2 cursor-pointer">
      <input type="radio" bind:group={type} value="expense" class="text-rose-500 focus:ring-rose-400" />
      <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Expense</span>
    </label>
    <label class="flex items-center gap-2 cursor-pointer">
      <input type="radio" bind:group={type} value="income" class="text-emerald-500 focus:ring-emerald-400" />
      <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Income</span>
    </label>
  </div>

  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount</label>
      <input type="number" step="0.01" bind:value={amount} placeholder="0.00" class="input-field w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none" />
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
      <select bind:value={category} class="input-field w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none">
        {#each categories as cat}
          <option value={cat}>{cat}</option>
        {/each}
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Date</label>
      <input bind:this={dateInputEl} type="text" bind:value={date} class="input-field w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none" />
    </div>

    {#if familyMembers.length > 0}
      <div>
        <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Family Member</label>
        <select bind:value={familyMember} class="input-field w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none">
          <option value="">None</option>
          {#each familyMembers as member}
            <option value={member.name || member}>{member.name || member}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div>
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Note</label>
      <input type="text" bind:value={note} placeholder="Optional note..." class="input-field w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none" />
    </div>

    <button onclick={handleSubmit} disabled={submitting || !amount || !category} class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-600 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer">
      {#if submitting}
        <i class="ph ph-circle-notch animate-spin"></i>
      {/if}
      Add {type === 'expense' ? 'Expense' : 'Income'}
    </button>
  </div>

  <div class="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
    <div class="flex items-center gap-2 mb-3">
      <i class="ph ph-magic-wand text-blue-600"></i>
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">AI Quick Add</h3>
    </div>
    <div class="flex gap-2">
      <input type="text" bind:value={aiText} placeholder="e.g. 'Lunch $15 yesterday'" class="input-field flex-1 px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none" onkeydown={(e) => e.key === 'Enter' && handleAiQuickAdd()} />
      <button onclick={handleAiQuickAdd} disabled={aiProcessing || !aiText.trim()} class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors text-sm flex items-center gap-2 whitespace-nowrap cursor-pointer">
        {#if aiProcessing}
          <i class="ph ph-circle-notch animate-spin"></i>
        {:else}
          <i class="ph ph-lightning"></i>
        {/if}
        AI
      </button>
    </div>
    <div class="mt-3">
      <button onclick={triggerReceiptUpload} disabled={receiptProcessing} class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer disabled:text-slate-300">
        <i class="ph ph-camera"></i>
        <span>{receiptProcessing ? 'Importing...' : 'Import Receipts'}</span>
      </button>
      <input bind:this={receiptInput} type="file" accept="image/*" multiple class="hidden" onchange={handleBulkReceiptUpload} />
      {#if receiptProgress}
        <div class="flex items-center gap-2 text-sm text-slate-500 mt-2">
          <i class="ph ph-circle-notch animate-spin"></i>
          <span>{receiptProgress}</span>
        </div>
      {/if}
    </div>
  </div>
</div>

<BulkImportModal
  show={showBulkModal}
  results={parsedReceipts}
  onclose={() => { showBulkModal = false; parsedReceipts = []; }}
  onsave={handleBulkSave}
/>
