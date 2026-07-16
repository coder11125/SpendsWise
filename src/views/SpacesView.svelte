<script lang="ts">
  import { getSpaces, getUserId, confirmDialog } from '../lib/state.svelte.js';
  import { createSpace, renameSpace, addSpaceMember, renameSpaceMember, removeSpaceMember, leaveSpace, deleteSpace } from '../lib/api.js';

  let spaces = $derived(getSpaces());
  let myUserId = $derived(getUserId());

  let newHubName = $state('');
  let creating = $state(false);
  let error = $state('');

  let inviteEmail = $state<Record<string, string>>({});
  let inviteNickname = $state<Record<string, string>>({});

  let renamingSpaceId = $state('');
  let spaceRenameDraft = $state('');

  let renamingMemberUserId = $state('');
  let memberRenameDraft = $state('');

  function isOwner(space: any): boolean {
    return space.members.find((m: any) => m.userId === myUserId)?.role === 'owner';
  }

  async function handleCreate() {
    error = '';
    const name = newHubName.trim();
    if (!name) return;
    creating = true;
    try {
      await createSpace(name);
      newHubName = '';
    } catch (err: any) {
      error = err.message || 'Failed to create Hub';
    } finally {
      creating = false;
    }
  }

  function startSpaceRename(space: any) {
    renamingSpaceId = space.id;
    spaceRenameDraft = space.name;
  }

  async function saveSpaceRename(spaceId: string) {
    const name = spaceRenameDraft.trim();
    if (!name) return;
    try {
      await renameSpace(spaceId, name);
      renamingSpaceId = '';
    } catch (err: any) {
      error = err.message || 'Failed to rename Hub';
    }
  }

  async function handleInvite(spaceId: string) {
    error = '';
    const email = (inviteEmail[spaceId] || '').trim();
    const nickname = (inviteNickname[spaceId] || '').trim();
    if (!email || !nickname) return;
    try {
      await addSpaceMember(spaceId, email, nickname);
      inviteEmail = { ...inviteEmail, [spaceId]: '' };
      inviteNickname = { ...inviteNickname, [spaceId]: '' };
    } catch (err: any) {
      error = err.message || 'Failed to invite member';
    }
  }

  function startMemberRename(userId: string, current: string) {
    renamingMemberUserId = userId;
    memberRenameDraft = current;
  }

  async function saveMemberRename(spaceId: string) {
    const nickname = memberRenameDraft.trim();
    if (!nickname) return;
    try {
      await renameSpaceMember(spaceId, renamingMemberUserId, nickname);
      renamingMemberUserId = '';
    } catch (err: any) {
      error = err.message || 'Failed to rename member';
    }
  }

  async function handleRemove(spaceId: string, userId: string) {
    if (userId === myUserId) {
      if (!await confirmDialog('Leave this Hub?')) return;
      await leaveSpace(spaceId, userId);
      return;
    }
    if (!await confirmDialog('Remove this member from the Hub?')) return;
    try {
      await removeSpaceMember(spaceId, userId);
    } catch (err: any) {
      error = err.message || 'Failed to remove member';
    }
  }

  async function handleDelete(spaceId: string) {
    if (!await confirmDialog('Permanently delete this Hub and all its shared expenses? This cannot be undone.')) return;
    try {
      await deleteSpace(spaceId);
    } catch (err: any) {
      error = err.message || 'Failed to delete Hub';
    }
  }
</script>

<div class="space-y-6">
  <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
    <div class="flex items-center gap-2 mb-1">
      <i class="ph ph-users-three text-xl text-blue-600"></i>
      <h1 class="text-xl font-bold text-slate-800 dark:text-slate-100">Spaces</h1>
    </div>
    <p class="text-sm text-slate-500 dark:text-slate-400 mb-4">Create a Hub to share expenses and income with other accounts. Up to 6 Hubs can exist across the app.</p>

    <form onsubmit={(e) => { e.preventDefault(); handleCreate(); }} class="flex gap-2">
      <input
        type="text"
        bind:value={newHubName}
        placeholder="New Hub name..."
        class="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
      />
      <button
        type="submit"
        disabled={!newHubName.trim() || creating}
        class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
      >
        <i class="ph ph-plus"></i>
        Create
      </button>
    </form>

    {#if error}
      <p class="text-sm text-rose-600 bg-rose-50 dark:bg-rose-900/30 px-3 py-2 rounded-lg mt-3">{error}</p>
    {/if}
  </div>

  {#if spaces.length === 0}
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-10 text-center">
      <i class="ph ph-users-three text-4xl text-slate-300 dark:text-slate-600 mb-2"></i>
      <p class="text-sm text-slate-500 dark:text-slate-400">No Hubs yet. Create one above to start sharing expenses.</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {#each spaces as space (space.id)}
        <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-5">
          <div class="flex items-center justify-between mb-4">
            {#if renamingSpaceId === space.id}
              <form onsubmit={(e) => { e.preventDefault(); saveSpaceRename(space.id); }} class="flex items-center gap-2 flex-1">
                <input type="text" bind:value={spaceRenameDraft} class="flex-1 px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500" />
                <button type="submit" class="text-emerald-600 hover:text-emerald-700"><i class="ph ph-check text-sm"></i></button>
                <button type="button" onclick={() => renamingSpaceId = ''} class="text-slate-400 hover:text-slate-600"><i class="ph ph-x text-sm"></i></button>
              </form>
            {:else}
              <div class="flex items-center gap-2">
                <span class="font-semibold text-slate-800 dark:text-slate-100 text-lg">{space.name}</span>
                {#if isOwner(space)}
                  <span class="text-[10px] uppercase tracking-wide bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">Owner</span>
                  <button onclick={() => startSpaceRename(space)} class="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" aria-label="Rename Hub">
                    <i class="ph ph-pencil-simple text-sm"></i>
                  </button>
                {/if}
              </div>
              {#if isOwner(space)}
                <button onclick={() => handleDelete(space.id)} class="text-rose-500 hover:text-rose-700 transition-colors" aria-label="Delete Hub">
                  <i class="ph ph-trash text-sm"></i>
                </button>
              {/if}
            {/if}
          </div>

          <ul class="space-y-1.5 mb-4">
            {#each space.members as member (member.userId)}
              <li class="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-1.5">
                {#if renamingMemberUserId === member.userId}
                  <form onsubmit={(e) => { e.preventDefault(); saveMemberRename(space.id); }} class="flex items-center gap-2 flex-1">
                    <input type="text" bind:value={memberRenameDraft} class="flex-1 px-2 py-1 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" />
                    <button type="submit" class="text-emerald-600 hover:text-emerald-700"><i class="ph ph-check text-sm"></i></button>
                    <button type="button" onclick={() => renamingMemberUserId = ''} class="text-slate-400 hover:text-slate-600"><i class="ph ph-x text-sm"></i></button>
                  </form>
                {:else}
                  <span class="text-sm font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    {member.nickname}
                    {#if member.status === 'pending'}
                      <span class="text-[10px] uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">Pending</span>
                    {/if}
                  </span>
                  <div class="flex items-center gap-2">
                    {#if member.userId === myUserId || isOwner(space)}
                      <button onclick={() => startMemberRename(member.userId, member.nickname)} class="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors" aria-label="Rename member">
                        <i class="ph ph-pencil-simple text-sm"></i>
                      </button>
                    {/if}
                    {#if member.userId === myUserId || (isOwner(space) && member.role !== 'owner')}
                      <button onclick={() => handleRemove(space.id, member.userId)} class="text-rose-500 hover:text-rose-700 transition-colors" aria-label={member.userId === myUserId ? 'Leave Hub' : 'Remove member'}>
                        <i class="ph {member.userId === myUserId ? 'ph-sign-out' : 'ph-trash'} text-sm"></i>
                      </button>
                    {/if}
                  </div>
                {/if}
              </li>
            {/each}
          </ul>

          {#if isOwner(space)}
            <form onsubmit={(e) => { e.preventDefault(); handleInvite(space.id); }} class="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={inviteEmail[space.id] || ''}
                oninput={(e: any) => inviteEmail = { ...inviteEmail, [space.id]: e.target.value }}
                placeholder="Invite by email..."
                class="flex-1 px-3 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <input
                type="text"
                value={inviteNickname[space.id] || ''}
                oninput={(e: any) => inviteNickname = { ...inviteNickname, [space.id]: e.target.value }}
                placeholder="Nickname..."
                class="w-full sm:w-28 px-3 py-1.5 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={!(inviteEmail[space.id] || '').trim() || !(inviteNickname[space.id] || '').trim()}
                class="px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Invite
              </button>
            </form>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>
