<script lang="ts">
  import { getAllCategories, addCustomCategory } from '../lib/state.svelte.js';

  let { type = 'expense', value = $bindable(''), selectClass = '', id = '' } = $props();

  let adding = $state(false);
  let newCategory = $state('');
  let inputEl;

  let categories = $derived(getAllCategories(type));

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
  <select {id} {value} onchange={handleChange} class={selectClass}>
    {#if !value}
      <option value="" disabled>Select category</option>
    {/if}
    {#each categories as cat}
      <option value={cat}>{cat}</option>
    {/each}
    <option value="__add__">+ Add new category…</option>
  </select>
{/if}
