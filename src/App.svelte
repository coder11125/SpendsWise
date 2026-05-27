<script>
  import { onMount } from 'svelte';
  import { fetchCsrfToken, checkSession } from './lib/api.js';
  import { getIsLoggedIn, getCurrentFilter, setCurrentFilter, getCurrentCurrency } from './lib/state.svelte.js';
  import { getCurrencySymbol } from './lib/currency.js';
  import Sidebar from './components/Sidebar.svelte';
  import Header from './components/Header.svelte';
  import Dashboard from './views/Dashboard.svelte';
  import IncomeView from './views/IncomeView.svelte';
  import ExpenseView from './views/ExpenseView.svelte';
  import HistoryView from './views/HistoryView.svelte';
  import AccountView from './views/AccountView.svelte';
  import AuthModal from './components/AuthModal.svelte';
  import EditModal from './components/EditModal.svelte';
  import CurrencyModal from './components/CurrencyModal.svelte';
  import FamilyModal from './components/FamilyModal.svelte';
  import ImportModal from './components/ImportModal.svelte';
  import DeleteAllModal from './components/DeleteAllModal.svelte';
  import MobileQuickAdd from './components/MobileQuickAdd.svelte';
  import AiChatPanel from './components/AiChatPanel.svelte';

  let sidebarOpen = $state(false);
  let activeFilter = $state(getCurrentFilter());
  let editingItem = $state(null);
  let showCurrencyModal = $state(false);
  let showFamilyModal = $state(false);
  let showMobileQuickAdd = $state(false);
  let showAiChat = $state(false);
  let importResult = $state(null);
  let deleteAllModalOpen = $state(false);

  function handleNavigate(filter) {
    if (filter === 'people') {
      showFamilyModal = true;
      return;
    }
    activeFilter = filter;
    setCurrentFilter(filter);
    sidebarOpen = false;
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
    await fetchCsrfToken();
    await checkSession();
  });

  let currentView = $derived(() => {
    switch (activeFilter) {
      case 'income': return IncomeView;
      case 'expense': return ExpenseView;
      case 'history': return HistoryView;
      case 'account': return AccountView;
      default: return Dashboard;
    }
  });
</script>

<div class="h-screen flex overflow-hidden bg-slate-50 dark:bg-slate-900">
  {#if sidebarOpen}
    <div role="presentation" onclick={() => sidebarOpen = false} class="fixed inset-0 bg-black/50 z-40 lg:hidden"></div>
  {/if}

  <div class="fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 lg:translate-x-0 {sidebarOpen ? 'translate-x-0' : '-translate-x-full'}">
    <Sidebar activeFilter={activeFilter} onnavigate={handleNavigate} />
  </div>

  <div class="flex-1 flex flex-col min-w-0">
    <Header
      ontogglemenu={() => sidebarOpen = !sidebarOpen}
      onopencurrency={() => showCurrencyModal = true}
    />

    <main class="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-6">
      {#if activeFilter === 'all'}
        <Dashboard />
      {:else if activeFilter === 'income'}
        <IncomeView />
      {:else if activeFilter === 'expense'}
        <ExpenseView />
      {:else if activeFilter === 'history'}
        <HistoryView />
      {:else if activeFilter === 'account'}
        <AccountView />
      {/if}
    </main>
  </div>
</div>

<AuthModal />

{#if editingItem}
  <EditModal
    expenseItem={editingItem}
    onclose={() => editingItem = null}
    onsaved={() => editingItem = null}
  />
{/if}

{#if showCurrencyModal}
  <CurrencyModal onclose={() => showCurrencyModal = false} />
{/if}

{#if showFamilyModal}
  <FamilyModal onclose={() => showFamilyModal = false} />
{/if}

{#if importResult}
  <ImportModal result={importResult} onclose={() => importResult = null} />
{/if}

{#if deleteAllModalOpen}
  <DeleteAllModal
    onclose={() => deleteAllModalOpen = false}
    onconfirm={() => deleteAllModalOpen = false}
  />
{/if}

{#if showMobileQuickAdd}
  <MobileQuickAdd show={showMobileQuickAdd} onclose={() => showMobileQuickAdd = false} />
{/if}

<AiChatPanel show={showAiChat} onclose={() => showAiChat = false} />

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
  class="fixed bottom-6 right-6 z-40 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-xl transition-all hover:scale-105 active:scale-95 cursor-pointer"
  aria-label="Open AI chat"
>
  <i class="ph-fill ph-chat-circle-dots text-2xl"></i>
</button>
