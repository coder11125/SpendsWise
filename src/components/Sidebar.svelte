<script>
  import { getEmail, getIsLoggedIn } from '../lib/state.svelte.js';
  import { logout } from '../lib/api.js';

  let { activeFilter = 'all', onnavigate } = $props();

  let email = $derived(getEmail());
  let isLoggedIn = $derived(getIsLoggedIn());

  const navItems = [
    { filter: 'all', icon: 'ph-chart-pie-slice', label: 'Dashboard' },
    { filter: 'income', icon: 'ph-trend-up', label: 'Income' },
    { filter: 'expense', icon: 'ph-trend-down', label: 'Expense' },
    { filter: 'history', icon: 'ph-clock-counter-clockwise', label: 'Expense History' },
    { filter: 'account', icon: 'ph-user-circle', label: 'My Account' },
  ];

  function handleNav(filter) {
    onnavigate?.(filter);
  }

  async function handleLogout() {
    await logout();
    window.location.reload();
  }
</script>

<aside class="flex flex-col h-full bg-slate-900 text-white">
  <div class="p-5 border-b border-slate-800">
    <div class="flex items-center gap-3">
      <div class="w-9 h-9 bg-blue-600 rounded-lg flex items-center justify-center">
        <i class="ph ph-wallet text-white text-lg"></i>
      </div>
      <div>
        <h1 class="font-bold text-lg leading-tight">SpendsWise</h1>
        <p class="text-xs text-slate-400">Global Budget Tracker</p>
      </div>
    </div>
  </div>

  <nav class="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
    {#each navItems as item}
      <button
        onclick={() => handleNav(item.filter)}
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer {activeFilter === item.filter ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800'}"
      >
        <i class="ph {item.icon} text-lg"></i>
        <span>{item.label}</span>
      </button>
    {/each}

    <div class="pt-3 mt-3 border-t border-slate-800">
      <button
        onclick={() => handleNav('people')}
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer {activeFilter === 'people' ? 'bg-blue-600/20 text-blue-400' : 'text-slate-400 hover:bg-slate-800'}"
      >
        <i class="ph ph-users text-lg"></i>
        <span>People</span>
      </button>
    </div>
  </nav>

  <div class="p-4 border-t border-slate-800">
    {#if isLoggedIn}
      <div class="flex items-center gap-3 mb-3 px-1">
        <div class="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
          {(email || '?')[0].toUpperCase()}
        </div>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-slate-200 truncate">{email}</p>
        </div>
      </div>
      <button
        onclick={handleLogout}
        class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <i class="ph ph-sign-out text-lg"></i>
        <span>Logout</span>
      </button>
    {/if}
  </div>
</aside>
