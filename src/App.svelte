<script lang="ts">
  import { onMount } from 'svelte';
  import { fetchCsrfToken, checkSession } from './lib/api.js';
  import { getIsLoggedIn, getAuthChecking, setAuthChecking, getCurrentCurrency, initRouter, getCurrentView, navigate } from './lib/state.svelte.js';
  import { getCurrencySymbol } from './lib/currency.js';
  import Sidebar from './components/Sidebar.svelte';
  import Header from './components/Header.svelte';
  import Dashboard from './views/Dashboard.svelte';
  import AuthModal from './components/AuthModal.svelte';
  import ConfirmModal from './components/ConfirmModal.svelte';

  let sidebarOpen = $state(false);
  let sidebarCollapsed = $state(typeof localStorage !== 'undefined' && localStorage.getItem('sw_sidebar_collapsed') === 'true');
  let editingItem = $state(null);
  let showCurrencyModal = $state(false);
  let showMobileQuickAdd = $state(false);
  let showAiChat = $state(false);
  let importResult = $state(null);
  let deleteAllModalOpen = $state(false);

  // Views/modals beyond the dashboard are loaded on demand so the initial
  // bundle only pays for what's shown on first paint. Each loader result is
  // cached in its slot so re-opening/re-navigating doesn't re-fetch.
  let IncomeView = $state(null);
  let ExpenseView = $state(null);
  let AccountView = $state(null);
  let SummariesView = $state(null);
  let SpacesView = $state(null);
  let AiChatPanel = $state(null);
  let EditModal = $state(null);
  let CurrencyModal = $state(null);
  let ImportModal = $state(null);
  let DeleteAllModal = $state(null);
  let MobileQuickAdd = $state(null);

  $effect(() => {
    if (view === 'income' && !IncomeView) import('./views/IncomeView.svelte').then(m => IncomeView = m.default);
    else if (view === 'expense' && !ExpenseView) import('./views/ExpenseView.svelte').then(m => ExpenseView = m.default);
    else if (view === 'account' && !AccountView) import('./views/AccountView.svelte').then(m => AccountView = m.default);
    else if (view === 'summaries' && !SummariesView) import('./views/SummariesView.svelte').then(m => SummariesView = m.default);
    else if (view === 'spaces' && !SpacesView) import('./views/SpacesView.svelte').then(m => SpacesView = m.default);
    else if (view === 'ai' && !AiChatPanel) import('./components/AiChatPanel.svelte').then(m => AiChatPanel = m.default);
  });

  $effect(() => { if (editingItem && !EditModal) import('./components/EditModal.svelte').then(m => EditModal = m.default); });
  $effect(() => { if (showCurrencyModal && !CurrencyModal) import('./components/CurrencyModal.svelte').then(m => CurrencyModal = m.default); });
  $effect(() => { if (importResult && !ImportModal) import('./components/ImportModal.svelte').then(m => ImportModal = m.default); });
  $effect(() => { if (deleteAllModalOpen && !DeleteAllModal) import('./components/DeleteAllModal.svelte').then(m => DeleteAllModal = m.default); });
  $effect(() => { if (showMobileQuickAdd && !MobileQuickAdd) import('./components/MobileQuickAdd.svelte').then(m => MobileQuickAdd = m.default); });
  $effect(() => { if (showAiChat && !AiChatPanel) import('./components/AiChatPanel.svelte').then(m => AiChatPanel = m.default); });

  function handleNavigate(filter) {
    navigate('/' + filter);
    sidebarOpen = false;
  }

  function toggleSidebarCollapsed() {
    sidebarCollapsed = !sidebarCollapsed;
    localStorage.setItem('sw_sidebar_collapsed', String(sidebarCollapsed));
  }

  function handleEditItem(e) {
    editingItem = e.detail;
  }

  $effect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('edit-expense', handleEditItem);
      window.addEventListener('edit-income', handleEditItem);
      window.addEventListener('edit-item', handleEditItem);
      return () => {
        window.removeEventListener('edit-expense', handleEditItem);
        window.removeEventListener('edit-income', handleEditItem);
        window.removeEventListener('edit-item', handleEditItem);
      };
    }
  });

  onMount(async () => {
    initRouter();
    await Promise.allSettled([fetchCsrfToken(), checkSession()]);
    setAuthChecking(false);
  });

  let view = $derived(getCurrentView());
</script>

{#if getAuthChecking()}
  <div class="h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
    <i class="ph ph-circle-notch animate-spin text-3xl text-blue-500"></i>
  </div>
{:else}
<div class="h-screen flex overflow-hidden bg-slate-50 dark:bg-slate-900">
  {#if sidebarOpen}
    <div role="presentation" onclick={() => sidebarOpen = false} class="fixed inset-0 bg-black/50 z-40 lg:hidden"></div>
  {/if}

  <div class="fixed lg:static inset-y-0 left-0 z-50 w-64 {sidebarCollapsed ? 'lg:w-16' : 'lg:w-64'} flex-shrink-0 transform transition-all duration-300 lg:translate-x-0 {sidebarOpen ? 'translate-x-0' : '-translate-x-full invisible lg:visible'}">
    <Sidebar activeFilter={view} onnavigate={handleNavigate} collapsed={sidebarCollapsed} oncollapsetoggle={toggleSidebarCollapsed} />
  </div>

  <div class="flex-1 flex flex-col min-w-0 h-full relative z-0">
    {#if view !== 'ai'}
      <Header
        ontogglemenu={() => sidebarOpen = !sidebarOpen}
        onopencurrency={() => showCurrencyModal = true}
        view={view}
      />
    {/if}

    <main class="flex-1 min-h-0 {view === 'ai' ? 'flex flex-col overflow-hidden' : 'overflow-y-auto overflow-x-hidden custom-scrollbar p-4 lg:p-6'}">
      {#if view === 'dashboard'}
        <Dashboard />
      {:else if view === 'income' && IncomeView}
        <IncomeView />
      {:else if view === 'expense' && ExpenseView}
        <ExpenseView />
      {:else if view === 'account' && AccountView}
        <AccountView />
      {:else if view === 'summaries' && SummariesView}
        <SummariesView />
      {:else if view === 'spaces' && SpacesView}
        <SpacesView />
      {:else if view === 'ai' && AiChatPanel}
        <AiChatPanel embedded ontogglemenu={() => sidebarOpen = !sidebarOpen} />
      {:else}
        <div class="h-full flex items-center justify-center">
          <i class="ph ph-circle-notch animate-spin text-3xl text-blue-500"></i>
        </div>
      {/if}
    </main>
  </div>
</div>
{/if}

<AuthModal />
<ConfirmModal />

{#if editingItem && EditModal}
  <EditModal
    expenseItem={editingItem}
    onclose={() => editingItem = null}
    onsaved={() => editingItem = null}
  />
{/if}

{#if showCurrencyModal && CurrencyModal}
  <CurrencyModal onclose={() => showCurrencyModal = false} />
{/if}


{#if importResult && ImportModal}
  <ImportModal result={importResult} onclose={() => importResult = null} />
{/if}

{#if deleteAllModalOpen && DeleteAllModal}
  <DeleteAllModal
    onclose={() => deleteAllModalOpen = false}
    onconfirm={() => deleteAllModalOpen = false}
  />
{/if}

{#if showMobileQuickAdd && MobileQuickAdd}
  <MobileQuickAdd show={showMobileQuickAdd} onclose={() => showMobileQuickAdd = false} />
{/if}

{#if showAiChat && AiChatPanel}
  <AiChatPanel show={showAiChat} onclose={() => showAiChat = false} />
{/if}

<!-- Mobile Quick Add FAB -->
<button
  onclick={() => showMobileQuickAdd = true}
  id="mobileQuickAddBtn"
  class="fixed bottom-6 left-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 md:hidden cursor-pointer"
  aria-label="Quick add"
>
  <i class="ph ph-plus text-2xl"></i>
</button>

<!-- AI Chat FAB -->
<button
  onclick={() => showAiChat = true}
  class="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer lg:hidden"
  aria-label="Open AI chat"
>
  <i class="ph-fill ph-chat-circle-dots text-2xl"></i>
</button>
