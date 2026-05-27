<script lang="ts">
  import { getCurrentCurrency, getIsLoggedIn } from '../lib/state.svelte.js';
  import { getCurrencySymbol } from '../lib/currency.js';

  let { ontogglemenu, onopencurrency } = $props();

  let currentCurrency = $derived(getCurrentCurrency());
  let isLoggedIn = $derived(getIsLoggedIn());
  let symbol = $derived(getCurrencySymbol(currentCurrency));
</script>

<header class="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-4 lg:px-6 h-16 flex items-center justify-between sticky top-0 z-30">
  <div class="flex items-center gap-3">
    <button
      onclick={() => ontogglemenu?.()}
      class="lg:hidden p-2 text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
      aria-label="Toggle sidebar"
    >
      <i class="ph ph-list text-xl"></i>
    </button>

  </div>

  <div class="flex items-center gap-2">
    {#if isLoggedIn}
      <button
        onclick={() => onopencurrency?.()}
        class="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
      >
        <i class="ph ph-currency-circle-dollar"></i>
        <span>{symbol}{currentCurrency}</span>
      </button>
    {/if}
  </div>
</header>
