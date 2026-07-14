<script lang="ts">
  import { onMount } from 'svelte';
  import flatpickr from 'flatpickr';
  import { saveTransaction, parseReceiptsBulk } from '../lib/api.js';
  import { getFamilyMembers, getAllCategories } from '../lib/state.svelte.js';
  import { compressImageToDataUrl } from '../lib/utils.js';
  import BulkImportModal from './BulkImportModal.svelte';
  import CategorySelect from './CategorySelect.svelte';

  let { onadd } = $props();

  let type = $state('expense');
  let amount = $state('');
  let category = $state('Food & Dining');
  let date = $state(new Date().toISOString().split('T')[0]);
  let familyMember = $state('');
  let note = $state('');
  let submitting = $state(false);
  let fpInstance = $state(null);
  let endDateFp = $state(null);
  let dateInputEl;
  let endDateInputEl;

  // Recurrence state
  let isRecurring = $state(false);
  let recurrenceFrequency = $state('monthly');
  let recurrenceEndDate = $state('');

  let receiptProcessing = $state(false);
  let receiptProgress = $state('');
  let parsedReceipts = $state<any[]>([]);
  let showBulkModal = $state(false);
  let ocrPro = $state(false);

  let categories = $derived(getAllCategories(type));
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
        altInput: true,
        altFormat: 'd/m/Y',
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
      endDateFp?.destroy();
    };
  });

  $effect(() => {
    if (endDateInputEl && isRecurring && !endDateFp) {
      import('flatpickr').then((mod) => {
        endDateFp = mod.default(endDateInputEl, {
          dateFormat: 'Y-m-d',
          altInput: true,
          altFormat: 'd/m/Y',
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

  async function handleSubmit() {
    if (!type || !amount || !category || !date) return;
    submitting = true;

    let recurrence = null;
    if (isRecurring) {
      recurrence = {
        frequency: recurrenceFrequency,
        nextDueDate: date,
        endDate: recurrenceEndDate || null,
        isActive: true,
      };
    }

    const result = await saveTransaction({
      type,
      amount: parseFloat(amount),
      category,
      date,
      familyMember,
      note,
      recurrence,
    });
    submitting = false;
    if (result) {
      amount = '';
      note = '';
      familyMember = '';
      date = new Date().toISOString().split('T')[0];
      isRecurring = false;
      recurrenceFrequency = 'monthly';
      recurrenceEndDate = '';
      if (fpInstance) fpInstance.setDate(date);
      onadd?.(result);
    }
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
      const data = await parseReceiptsBulk(dataUrls, ocrPro);
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
      <label class="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Type</label>
      <CategorySelect
        type={type}
        bind:value={category}
        selectClass="input-field w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-800 dark:text-slate-100 text-sm focus:outline-none"
      />
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

    <!-- Recurrence Toggle -->
    <div class="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <i class="ph ph-repeat text-blue-600"></i>
          <span class="text-sm font-medium text-slate-700 dark:text-slate-300">Recurring Transaction</span>
        </div>
        <button type="button" onclick={() => isRecurring = !isRecurring}
          class="relative w-10 h-5 rounded-full transition-colors {isRecurring ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}">
          <div class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform {isRecurring ? 'translate-x-5' : ''}"></div>
        </button>
      </div>
      {#if isRecurring}
        <div class="space-y-3 mt-3 animate-fade-in">
          <div>
            <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Frequency</label>
            <div class="flex gap-1">
              {#each [
                { v: 'daily', l: 'Daily' },
                { v: 'weekly', l: 'Weekly' },
                { v: 'biweekly', l: 'Bi-weekly' },
                { v: 'monthly', l: 'Monthly' },
                { v: 'yearly', l: 'Yearly' }
              ] as opt}
                <button type="button" onclick={() => recurrenceFrequency = opt.v}
                  class="px-2.5 py-1 text-xs rounded-md font-medium transition-colors {recurrenceFrequency === opt.v ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-500'}">
                  {opt.l}
                </button>
              {/each}
            </div>
          </div>
          <div>
            <label class="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">End Date (optional)</label>
            <input bind:this={endDateInputEl} type="text" bind:value={recurrenceEndDate} placeholder="No end date"
              class="input-field w-full px-3 py-1.5 bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-md text-slate-800 dark:text-slate-100 text-xs focus:outline-none" />
          </div>
        </div>
      {/if}
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
      <i class="ph ph-lightning text-blue-600"></i>
      <h3 class="text-sm font-semibold text-slate-700 dark:text-slate-300">Quick Add</h3>
    </div>
    <div>
      <button onclick={triggerReceiptUpload} disabled={receiptProcessing} class="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer disabled:text-slate-300">
        <i class="ph ph-camera"></i>
        <span>{receiptProcessing ? 'Importing...' : 'Import Receipts'}</span>
      </button>
      <div class="flex gap-2 mt-2">
        <label class="flex-1 flex flex-col gap-0.5 cursor-pointer border rounded-lg px-3 py-2 transition-colors {!ocrPro ? 'border-blue-300 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600'}">
          <span class="flex items-center gap-1.5">
            <input type="radio" name="ocrMode" checked={!ocrPro} onchange={() => ocrPro = false} class="text-blue-600 focus:ring-blue-500" />
            <span class="text-xs font-medium text-slate-700 dark:text-slate-200">Basic OCR</span>
          </span>
          <span class="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Good OCR capabilities at least amount of quota</span>
        </label>
        <label class="flex-1 flex flex-col gap-0.5 cursor-pointer border rounded-lg px-3 py-2 transition-colors {ocrPro ? 'border-blue-300 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-200 dark:border-slate-600'}">
          <span class="flex items-center gap-1.5">
            <input type="radio" name="ocrMode" checked={ocrPro} onchange={() => ocrPro = true} class="text-blue-600 focus:ring-blue-500" />
            <span class="text-xs font-medium text-slate-700 dark:text-slate-200">OCR Pro <span class="text-slate-400 dark:text-slate-500 font-normal">(10 credits)</span></span>
          </span>
          <span class="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">Extreme OCR capabilities. Use sparingly for messy, handwritten receipts in low light</span>
        </label>
      </div>
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
