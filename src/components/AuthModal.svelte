<script lang="ts">
  import { login, register, showApp } from '../lib/api.js';
  import { getIsLoggedIn } from '../lib/state.svelte.js';

  let tab = $state('login');
  let email = $state('');
  let password = $state('');
  let error = $state('');
  let loading = $state(false);

  async function handleSubmit(e) {
    e.preventDefault();
    error = '';
    if (!email || !password) {
      error = 'Please fill in all fields.';
      return;
    }
    loading = true;
    try {
      const data = tab === 'login' ? await login(email, password) : await register(email, password);
      showApp(data.user.email, data.user.familyMembers, data.user.id);
    } catch (err) {
      error = err.message;
    } finally {
      loading = false;
    }
  }
</script>

{#if !getIsLoggedIn()}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in">
    <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
      <div class="flex items-center justify-between mb-6">
        <h1 class="text-xl font-bold text-slate-800">SpendsWise</h1>
        <i class="ph ph-wallet text-2xl text-blue-600"></i>
      </div>

      <div class="flex border border-slate-200 rounded-lg p-1 mb-6">
        <button
          class="flex-1 py-2 text-sm font-medium rounded-md transition-colors {tab === 'login' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-800'}"
          onclick={() => { tab = 'login'; error = ''; }}
        >Sign In</button>
        <button
          class="flex-1 py-2 text-sm font-medium rounded-md transition-colors {tab === 'register' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:text-slate-800'}"
          onclick={() => { tab = 'register'; error = ''; }}
        >Register</button>
      </div>

      <form onsubmit={handleSubmit} class="space-y-4">
        <div>
          <label for="authEmail" class="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            id="authEmail"
            type="email"
            bind:value={email}
            placeholder="your@email.com"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            autocomplete="email"
          />
        </div>
        <div>
          <label for="authPassword" class="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            id="authPassword"
            type="password"
            bind:value={password}
            placeholder="••••••••"
            class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            autocomplete={tab === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {#if error}
          <p class="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg">{error}</p>
        {/if}

        <button
          type="submit"
          disabled={loading}
          class="w-full py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {#if loading}
            <i class="ph ph-spinner animate-spin"></i>
            {tab === 'login' ? 'Signing in...' : 'Creating account...'}
          {:else}
            {tab === 'login' ? 'Sign In' : 'Create Account'}
          {/if}
        </button>
      </form>
    </div>
  </div>
{/if}
