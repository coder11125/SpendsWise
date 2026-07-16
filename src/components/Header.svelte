<script lang="ts">
  import { getCurrentCurrency, getIsLoggedIn, getRatesAreLive, getSpaces, getCurrentSpaceId, navigate } from '../lib/state.svelte.js';
  import { getCurrencySymbol } from '../lib/currency.js';
  import { switchSpace } from '../lib/api.js';

  let { ontogglemenu, onopencurrency, view = '' } = $props();

  let currentCurrency = $derived(getCurrentCurrency());
  let isLoggedIn = $derived(getIsLoggedIn());
  let symbol = $derived(getCurrencySymbol(currentCurrency));
  let ratesAreLive = $derived(getRatesAreLive());

  let spaces = $derived(getSpaces());
  let currentSpaceId = $derived(getCurrentSpaceId());
  let currentSpace = $derived(spaces.find(s => s.id === currentSpaceId));
  let switcherOpen = $state(false);

  async function selectSpace(spaceId: string | null) {
    switcherOpen = false;
    await switchSpace(spaceId);
  }
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
    {#if isLoggedIn && view !== 'ai'}
      <div class="relative">
        <button
          onclick={() => switcherOpen = !switcherOpen}
          class="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
        >
          <i class="ph {currentSpace ? 'ph-users-three' : 'ph-user'} text-lg"></i>
          <span class="max-w-[8rem] truncate">{currentSpace ? currentSpace.name : 'Personal'}</span>
          <i class="ph ph-caret-down text-xs"></i>
        </button>

        {#if switcherOpen}
          <div role="presentation" class="fixed inset-0 z-40" onclick={() => switcherOpen = false}></div>
          <div class="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg shadow-lg z-50 py-1 animate-fade-in">
            <button
              onclick={() => selectSpace(null)}
              class="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors {!currentSpaceId ? 'text-blue-600 font-medium' : 'text-slate-700 dark:text-slate-200'}"
            >
              <i class="ph ph-user"></i>
              Personal
            </button>
            {#each spaces as space (space.id)}
              <button
                onclick={() => selectSpace(space.id)}
                class="w-full text-left px-3 py-2 text-sm flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors truncate {currentSpaceId === space.id ? 'text-blue-600 font-medium' : 'text-slate-700 dark:text-slate-200'}"
              >
                <i class="ph ph-users-three"></i>
                <span class="truncate">{space.name}</span>
              </button>
            {/each}
            <div class="border-t border-slate-100 dark:border-slate-700 my-1"></div>
            <button
              onclick={() => { switcherOpen = false; navigate('/spaces'); }}
              class="w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <i class="ph ph-gear"></i>
              Manage Hubs...
            </button>
          </div>
        {/if}
      </div>
      <button
        onclick={() => onopencurrency?.()}
        title={ratesAreLive ? '' : 'Exchange rates unavailable — amounts shown are not converted'}
        class="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 rounded-lg text-sm font-medium text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
      >
        <i class="ph ph-currency-circle-dollar"></i>
        <span>{symbol}{currentCurrency}</span>
        {#if !ratesAreLive}
          <i class="ph ph-warning-circle text-amber-500 text-base" aria-label="Exchange rates unavailable"></i>
        {/if}
      </button>
    {/if}
  </div>
</header>
