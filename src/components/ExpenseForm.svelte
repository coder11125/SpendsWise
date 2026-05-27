<script>
  import { onMount } from 'svelte';
  import flatpickr from 'flatpickr';
  import { saveTransaction, parseWithAI, parseReceipt } from '../lib/api.js';
  import { getFamilyMembers } from '../lib/state.svelte.js';
  import { compressImageToDataUrl } from '../lib/utils.js';

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

  async function handleReceiptUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    receiptProcessing = true;
    try {
      const dataUrl = await compressImageToDataUrl(file, 1920, 0.7);
      const data = await parseReceipt(dataUrl);
      if (data) {
        if (data.type) type = data.type;
        if (data.amount != null) amount = String(data.amount);
        if (data.category) category = data.category;
        if (data.date) {
          date = data.date;
          if (fpInstance) fpInstance.setDate(date);
        }
        if (data.note) note = data.note;
      }
    } catch (err) {
      console.error('Receipt parse failed:', err);
    }
    receiptProcessing = false;
    e.target.value = '';
  }

  let receiptInput;

  function triggerReceiptUpload() {
    receiptInput?.click();
  }
</script>

<div class="bg-white rounded-xl shadow-sm p-6 animate-fade-in">
  <div class="flex items-center gap-2 mb-6">
    <i class="ph ph-plus-circle text-xl text-blue-600"></i>
    <h2 class="text-lg font-semibold text-slate-800">Add Transaction</h2>
  </div>

  <div class="flex gap-4 mb-4">
    <label class="flex items-center gap-2 cursor-pointer">
      <input type="radio" bind:group={type} value="expense" class="text-rose-500 focus:ring-rose-400" />
      <span class="text-sm font-medium text-slate-700">Expense</span>
    </label>
    <label class="flex items-center gap-2 cursor-pointer">
      <input type="radio" bind:group={type} value="income" class="text-emerald-500 focus:ring-emerald-400" />
      <span class="text-sm font-medium text-slate-700">Income</span>
    </label>
  </div>

  <div class="space-y-4">
    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Amount</label>
      <input type="number" step="0.01" bind:value={amount} placeholder="0.00" class="input-field w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none" />
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Category</label>
      <select bind:value={category} class="input-field w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none">
        {#each categories as cat}
          <option value={cat}>{cat}</option>
        {/each}
      </select>
    </div>

    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Date</label>
      <input bind:this={dateInputEl} type="text" bind:value={date} class="input-field w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none" />
    </div>

    {#if familyMembers.length > 0}
      <div>
        <label class="block text-sm font-medium text-slate-700 mb-1">Family Member</label>
        <select bind:value={familyMember} class="input-field w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none">
          <option value="">None</option>
          {#each familyMembers as member}
            <option value={member.name || member}>{member.name || member}</option>
          {/each}
        </select>
      </div>
    {/if}

    <div>
      <label class="block text-sm font-medium text-slate-700 mb-1">Note</label>
      <input type="text" bind:value={note} placeholder="Optional note..." class="input-field w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none" />
    </div>

    <button onclick={handleSubmit} disabled={submitting || !amount || !category} class="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-medium rounded-lg transition-colors text-sm flex items-center justify-center gap-2 cursor-pointer">
      {#if submitting}
        <i class="ph ph-circle-notch animate-spin"></i>
      {/if}
      Add {type === 'expense' ? 'Expense' : 'Income'}
    </button>
  </div>

  <div class="mt-6 pt-6 border-t border-slate-100">
    <div class="flex items-center gap-2 mb-3">
      <i class="ph ph-magic-wand text-blue-600"></i>
      <h3 class="text-sm font-semibold text-slate-700">AI Quick Add</h3>
    </div>
    <div class="flex gap-2">
      <input type="text" bind:value={aiText} placeholder="e.g. 'Lunch $15 yesterday'" class="input-field flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-sm focus:outline-none" onkeydown={(e) => e.key === 'Enter' && handleAiQuickAdd()} />
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
      <button onclick={triggerReceiptUpload} disabled={receiptProcessing} class="flex items-center gap-2 text-sm text-slate-600 hover:text-blue-600 transition-colors cursor-pointer disabled:text-slate-300">
        <i class="ph ph-camera"></i>
        <span>Upload Receipt</span>
      </button>
      <input bind:this={receiptInput} type="file" accept="image/*" class="hidden" onchange={handleReceiptUpload} />
      {#if receiptProcessing}
        <div class="flex items-center gap-2 text-sm text-slate-500 mt-2">
          <i class="ph ph-circle-notch animate-spin"></i>
          <span>Processing receipt...</span>
        </div>
      {/if}
    </div>
  </div>
</div>
