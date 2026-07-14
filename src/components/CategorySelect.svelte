<script lang="ts">
  import { getAllCategories, getCustomCategories, addCustomCategory, removeCustomCategory, confirmDialog } from '../lib/state.svelte.js';

  let { type = 'expense', value = $bindable(''), selectClass = '', id = '' } = $props();

  let adding = $state(false);
  let newCategory = $state('');
  let inputEl;

  let categories = $derived.by(() => {
    const cats = getAllCategories(type);
    return value && !cats.includes(value) ? [value, ...cats] : cats;
  });
  let isCustomSelected = $derived(getCustomCategories(type).includes(value));

  async function deleteSelected() {
    if (!isCustomSelected) return;
    if (!await confirmDialog(`Delete category "${value}"?`)) return;
    removeCustomCategory(type, value);
    value = '';
  }

  function handleChange(e) {
    const v = e.target.value;
    if (v === '__add__') {
      adding = true;
      newCategory = '';
      setTimeout(() => inputEl?.focus(), 50);
    } else {
      value = v;
    }
  }

  function confirmAdd() {
    const name = addCustomCategory(type, newCategory);
    if (name) value = name;
    adding = false;
  }

  function cancelAdd() {
    adding = false;
  }

  function handleKeydown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      confirmAdd();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelAdd();
    }
  }
</script>

{#if adding}
  <div class="flex gap-2">
    <input
      bind:this={inputEl}
      bind:value={newCategory}
      type="text"
      placeholder="New category name"
      onkeydown={handleKeydown}
      class={selectClass}
    />
    <button type="button" onclick={confirmAdd} title="Add category" class="px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm cursor-pointer">
      <i class="ph ph-check"></i>
    </button>
    <button type="button" onclick={cancelAdd} title="Cancel" class="px-3 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-sm cursor-pointer">
      <i class="ph ph-x"></i>
    </button>
  </div>
{:else}
  <div class="flex gap-2">
    <select {id} {value} onchange={handleChange} class={selectClass}>
      {#if !value}
        <option value="" disabled>Select category</option>
      {/if}
      {#each categories as cat}
        <option value={cat}>{cat}</option>
      {/each}
      <option value="__add__">+ Add new category…</option>
    </select>
    {#if isCustomSelected}
      <button type="button" onclick={deleteSelected} title="Delete custom category" class="px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm cursor-pointer">
        <i class="ph ph-trash"></i>
      </button>
    {/if}
  </div>
{/if}
