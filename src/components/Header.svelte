<script>
  import { getCurrentCurrency, getIsLoggedIn } from '../lib/state.svelte.js';
  import { getCurrencySymbol } from '../lib/currency.js';

  let { ontogglemenu, onopencurrency } = $props();

  let currentCurrency = $derived(getCurrentCurrency());
  let isLoggedIn = $derived(getIsLoggedIn());
  let symbol = $derived(getCurrencySymbol(currentCurrency));
</script>

<header class="bg-white border-b border-slate-200 px-4 lg:px-6 h-16 flex items-center justify-between sticky top-0 z-30">
  <div class="flex items-center gap-3">
    <button
      onclick={() => ontogglemenu?.()}
      class="lg:hidden p-2 text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
      aria-label="Toggle sidebar"
    >
      <i class="ph ph-list text-xl"></i>
    </button>
    <div class="hidden sm:flex items-center gap-2 text-slate-500">
      <i class="ph ph-map-pin text-sm"></i>
      <span class="text-sm font-medium">{currentCurrency}</span>
    </div>
  </div>

  <div class="flex items-center gap-2">
    {#if isLoggedIn}
      <button
        onclick={() => onopencurrency?.()}
        class="flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors cursor-pointer"
      >
        <i class="ph ph-currency-circle-dollar"></i>
        <span>{symbol}{currentCurrency}</span>
      </button>
    {/if}
  </div>
</header>
