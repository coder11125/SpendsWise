<script lang="ts">
  import { getFamilyMembers } from '../lib/state.svelte.js';
  import { addFamilyMemberOnServer, removeFamilyMemberOnServer } from '../lib/api.js';

  let { onclose } = $props();

  let name = $state('');
  let members = $derived(getFamilyMembers());
  let error = $state('');

  async function addMember() {
    const normalized = name.trim();
    if (!normalized) return;
    error = '';
    if (members.some(m => m.toLowerCase() === normalized.toLowerCase())) {
      error = 'Member already exists.';
      return;
    }
    const ok = await addFamilyMemberOnServer(normalized);
    if (ok) name = '';
  }

  async function removeMember(nameToRemove) {
    error = '';
    await removeFamilyMemberOnServer(nameToRemove);
  }
</script>

<div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-fade-in" onclick={(e) => { if (e.target === e.currentTarget) onclose?.(); }}>
  <div class="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-lg font-bold text-slate-800">Family Members</h2>
      <button onclick={() => onclose?.()} class="text-slate-400 hover:text-slate-600 transition-colors">
        <i class="ph ph-x text-xl"></i>
      </button>
    </div>

    <form onsubmit={(e) => { e.preventDefault(); addMember(); }} class="flex gap-2 mb-4">
      <input
        type="text"
        bind:value={name}
        placeholder="Enter name..."
        class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />
      <button
        type="submit"
        disabled={!name.trim()}
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
      >
        <i class="ph ph-plus"></i>
        Add
      </button>
    </form>

    {#if error}
      <p class="text-sm text-rose-600 bg-rose-50 px-3 py-2 rounded-lg mb-3">{error}</p>
    {/if}

    {#if members.length === 0}
      <div class="text-center py-8">
        <i class="ph ph-users text-4xl text-slate-300 mb-2"></i>
        <p class="text-sm text-slate-500">No family members yet. Add one above.</p>
      </div>
    {:else}
      <ul class="space-y-2">
        {#each members as member}
          <li class="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2">
            <span class="text-sm font-medium text-slate-700">{member}</span>
            <button onclick={() => removeMember(member)} class="text-rose-500 hover:text-rose-700 transition-colors">
              <i class="ph ph-trash text-sm"></i>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </div>
</div>
