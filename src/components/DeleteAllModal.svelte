<script>
  import { deleteAllExpenses } from '../lib/api.js';
  import { setExpense } from '../lib/state.svelte.js';

  let { onclose, onconfirm } = $props();

  let loading = $state(false);
  let error = $state('');

  async function handleDelete() {
    loading = true;
    error = '';
    try {
      await deleteAllExpenses();
      setExpense([]);
      onconfirm?.();
    } catch (err) {
      error = err.message || 'Failed to delete expenses.';
    } finally {
      loading = false;
    }
  }
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onclick={(e) => { if (e.target === e.currentTarget) onclose?.(); }}>
  <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
    <div class="flex items-center gap-3 mb-4">
      <div class="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
        <i class="ph ph-warning-circle text-rose-600 text-xl"></i>
      </div>
      <h2 class="text-lg font-bold text-slate-800">Delete All Expenses?</h2>
    </div>

    <p class="text-sm text-slate-600 mb-6">This action cannot be undone. All your expenses and income entries will be permanently removed.</p>

    {#if error}
      <p class="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg mb-4">{error}</p>
    {/if}

    <div class="flex gap-3">
      <button
        onclick={() => onclose?.()}
        disabled={loading}
        class="flex-1 py-2.5 bg-slate-100 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-200 disabled:opacity-50 transition-colors"
      >Cancel</button>
      <button
        onclick={handleDelete}
        disabled={loading}
        class="flex-1 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
      >
        {#if loading}
          <i class="ph ph-spinner animate-spin"></i>
          Deleting...
        {:else}
          <i class="ph ph-trash"></i>
          Delete All
        {/if}
      </button>
    </div>
  </div>
</div>
