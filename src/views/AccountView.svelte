<script>
  import { getExpense, getCurrentCurrency, setExpense, getBudgetGoals, setBudgetGoals } from '../lib/state.svelte.js';
  import { getCurrencySymbol } from '../lib/currency.js';
  import { changePassword, deleteAllExpenses, getProfile, uploadBulkExpenses, loadExpenses } from '../lib/api.js';
  import { calculateSummary } from '../lib/calculations.svelte.js';

  let profile = $state(null);
  let stats = $state({ income: 0, expenses: 0, balance: 0, expenseCount: 0, incomeCount: 0 });
  let isDark = $state(document.documentElement.classList.contains('dark'));
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let passwordMessage = $state('');
  let passwordError = $state('');
  let newGoalCategory = $state('');
  let newGoalAmount = $state('');
  let goalMessage = $state('');
  let importResult = $state(null);
  let isImporting = $state(false);
  let isDeletingAll = $state(false);

  async function loadProfile() {
    try {
      const data = await getProfile();
      profile = data;
    } catch {
      profile = { email: '' };
    }
  }

  async function refreshStats() {
    const expense = getExpense();
    const currency = getCurrentCurrency();
    const s = await calculateSummary(expense, currency);
    const incomeCount = expense.filter(i => i.type === 'income').length;
    const expenseCount = expense.filter(i => i.type === 'expense').length;
    stats = { ...s, incomeCount, expenseCount };
  }

  $effect(() => {
    getExpense();
    getCurrentCurrency();
    refreshStats();
  });

  $effect(() => {
    loadProfile();
  });

  function toggleDark() {
    isDark = !isDark;
    document.documentElement.classList.toggle('dark', isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  async function handleChangePassword() {
    passwordMessage = '';
    passwordError = '';
    if (!currentPassword || !newPassword) {
      passwordError = 'Please fill in all fields.';
      return;
    }
    if (newPassword.length < 6) {
      passwordError = 'New password must be at least 6 characters.';
      return;
    }
    if (newPassword !== confirmPassword) {
      passwordError = 'Passwords do not match.';
      return;
    }
    try {
      await changePassword(currentPassword, newPassword);
      passwordMessage = 'Password updated successfully.';
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
    } catch (err) {
      passwordError = err.message;
    }
  }

  function handleExportCsv() {
    const expenses = getExpense();
    if (expenses.length === 0) return;
    const headers = ['type', 'amount', 'category', 'date', 'familyMember', 'note', 'currency'];
    const rows = expenses.map(e => headers.map(h => {
      const val = e[h] || '';
      return String(val).includes(',') ? `"${val}"` : val;
    }).join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  let fileInput;

  function triggerImport() {
    fileInput.click();
  }

  async function handleFileSelect(ev) {
    const file = ev.target.files[0];
    if (!file) return;
    isImporting = true;
    importResult = null;
    try {
      const text = await file.text();
      const lines = text.trim().split('\n');
      if (lines.length < 2) {
        importResult = { success: false, message: 'CSV file is empty or has no data rows.' };
        return;
      }
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const rows = lines.slice(1).filter(l => l.trim()).map(line => {
        const values = line.split(',').map(v => v.trim());
        const obj = {};
        headers.forEach((h, i) => obj[h] = values[i] || '');
        return obj;
      });
      const res = await uploadBulkExpenses(rows);
      await loadExpenses();
      importResult = { success: true, message: `Successfully imported ${res.count || rows.length} item(s).` };
    } catch (err) {
      importResult = { success: false, message: err.message || 'Failed to import CSV.' };
    } finally {
      isImporting = false;
      ev.target.value = '';
    }
  }

  function handleAddGoal() {
    goalMessage = '';
    if (!newGoalCategory || !newGoalAmount) {
      goalMessage = 'Please enter a category and amount.';
      return;
    }
    const amount = parseFloat(newGoalAmount);
    if (isNaN(amount) || amount <= 0) {
      goalMessage = 'Please enter a valid amount.';
      return;
    }
    const goals = { ...getBudgetGoals(), [newGoalCategory]: amount };
    setBudgetGoals(goals);
    newGoalCategory = '';
    newGoalAmount = '';
    goalMessage = 'Goal added.';
  }

  function handleDeleteGoal(category) {
    const goals = { ...getBudgetGoals() };
    delete goals[category];
    setBudgetGoals(goals);
  }

  async function handleDeleteAll() {
    if (!confirm('Are you sure you want to permanently delete ALL expenses? This action cannot be undone.')) return;
    if (!confirm('This will remove every transaction from your account. Are you absolutely sure?')) return;
    isDeletingAll = true;
    try {
      await deleteAllExpenses();
      setExpense([]);
    } catch (err) {
      alert('Failed to delete expenses: ' + err.message);
    } finally {
      isDeletingAll = false;
    }
  }

  let goals = $derived(Object.entries(getBudgetGoals()));
</script>

<div class="w-full space-y-4">
  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <div class="flex items-center gap-4">
      <div class="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center text-white text-2xl font-bold flex-shrink-0">
        {profile?.email ? profile.email[0].toUpperCase() : '?'}
      </div>
      <div class="min-w-0 flex-1 overflow-hidden">
        <h2 class="text-xl font-bold text-slate-800 dark:text-slate-100 truncate" title={profile?.email}>{profile?.email || 'Loading...'}</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 truncate">
          {#if profile?.createdAt}
            Member since {new Date(profile.createdAt).toLocaleDateString()}
          {:else}
            {profile ? 'Account details' : ''}
          {/if}
        </p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Account Stats</h3>
    <div class="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-4 gap-4">
      <div class="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <p class="text-xs text-slate-500 dark:text-slate-400">Total Income</p>
        <p class="text-lg font-bold text-emerald-600">{getCurrencySymbol(getCurrentCurrency())}{stats.income.toFixed(2)}</p>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <p class="text-xs text-slate-500 dark:text-slate-400">Total Expenses</p>
        <p class="text-lg font-bold text-rose-600">{getCurrencySymbol(getCurrentCurrency())}{stats.expenses.toFixed(2)}</p>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <p class="text-xs text-slate-500 dark:text-slate-400">Net Balance</p>
        <p class="text-lg font-bold {stats.balance >= 0 ? 'text-emerald-600' : 'text-rose-600'}">{getCurrencySymbol(getCurrentCurrency())}{stats.balance.toFixed(2)}</p>
      </div>
      <div class="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
        <p class="text-xs text-slate-500 dark:text-slate-400">Transactions</p>
        <p class="text-lg font-bold text-slate-800 dark:text-slate-100">{stats.incomeCount + stats.expenseCount}</p>
      </div>
    </div>
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Import / Export</h3>
    <div class="grid grid-cols-1 sm:flex sm:flex-wrap gap-3">
      <button onclick={handleExportCsv}
        class="w-full sm:w-auto px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2">
        <i class="ph ph-download"></i>
        Export CSV
      </button>
      <button onclick={triggerImport}
        class="w-full sm:w-auto px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2">
        <i class="ph ph-upload"></i>
        {isImporting ? 'Importing...' : 'Import CSV'}
      </button>
    </div>
    <input type="file" accept=".csv" bind:this={fileInput} onchange={handleFileSelect} class="hidden" />
  </div>

  {#if importResult}
    <div role="presentation" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onclick={() => importResult = null}>
      <div role="presentation" class="bg-white dark:bg-slate-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-xl" onclick={(e) => e.stopPropagation()}>
        <div class="flex items-center gap-2 mb-4">
          <i class="ph {importResult.success ? 'ph-check-circle text-emerald-500' : 'ph-x-circle text-rose-500'} text-xl"></i>
          <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100">{importResult.success ? 'Import Successful' : 'Import Failed'}</h3>
        </div>
        <p class="text-slate-600 dark:text-slate-300">{importResult.message}</p>
        <button onclick={() => importResult = null}
          class="mt-4 px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors text-sm">Close</button>
      </div>
    </div>
  {/if}

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <div class="flex items-center justify-between">
      <div>
        <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Dark Mode</h3>
        <p class="text-sm text-slate-500 dark:text-slate-400">Toggle dark theme</p>
      </div>
      <button aria-label="Toggle dark mode" onclick={toggleDark}
        class="relative w-12 h-6 rounded-full transition-colors {isDark ? 'bg-rose-500' : 'bg-slate-300'}">
        <div class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform {isDark ? 'translate-x-6' : ''} flex items-center justify-center">
          <i class="ph {isDark ? 'ph-moon text-slate-800' : 'ph-sun text-yellow-500'} text-xs"></i>
        </div>
      </button>
    </div>
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Change Password</h3>
    <div class="space-y-3">
      <input type="password" placeholder="Current password" bind:value={currentPassword}
        class="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500" />
      <input type="password" placeholder="New password" bind:value={newPassword}
        class="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500" />
      <input type="password" placeholder="Confirm new password" bind:value={confirmPassword}
        class="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500" />
      <button onclick={handleChangePassword}
        class="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors text-sm font-medium">Update Password</button>
      {#if passwordMessage}
        <p class="text-sm text-emerald-600">{passwordMessage}</p>
      {/if}
      {#if passwordError}
        <p class="text-sm text-rose-600">{passwordError}</p>
      {/if}
    </div>
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <h3 class="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Budget Goals</h3>
    <div class="flex flex-col sm:flex-row gap-2 mb-4">
      <input type="text" placeholder="Category" bind:value={newGoalCategory}
        class="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500" />
      <div class="flex gap-2">
        <input type="number" placeholder="Amount" bind:value={newGoalAmount}
          class="flex-1 px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500" />
        <button onclick={handleAddGoal}
          class="px-4 py-2 bg-rose-500 hover:bg-rose-600 text-white rounded-lg transition-colors text-sm font-medium">Add</button>
      </div>
    </div>
    {#if goalMessage}
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-3">{goalMessage}</p>
    {/if}
    {#if goals.length === 0}
      <p class="text-sm text-slate-500 dark:text-slate-400">No budget goals set.</p>
    {:else}
      <ul class="space-y-2">
        {#each goals as [category, amount]}
          <li class="flex items-center justify-between py-2 px-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <span class="font-medium text-slate-800 dark:text-slate-100">{category}</span>
            <div class="flex items-center gap-3">
              <span class="text-slate-600 dark:text-slate-300">{getCurrencySymbol(getCurrentCurrency())}{Number(amount).toFixed(2)}</span>
              <button aria-label="Delete goal" onclick={() => handleDeleteGoal(category)} class="text-rose-500 hover:text-rose-700 transition-colors">
                <i class="ph ph-trash text-sm"></i>
              </button>
            </div>
          </li>
        {/each}
      </ul>
    {/if}
  </div>

  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-red-200 dark:border-red-800 p-6">
    <h3 class="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>
    <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Permanently delete all your transactions. This cannot be undone.</p>
    <button onclick={handleDeleteAll} disabled={isDeletingAll}
      class="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-medium">
      {isDeletingAll ? 'Deleting...' : 'Delete All Transactions'}
    </button>
  </div>
</div>
