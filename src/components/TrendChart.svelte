<script lang="ts">
  import { onMount } from 'svelte';
  import { renderTrendChart } from '../lib/charts.js';

  let { points = [], total = 0, average = 0, periodLabel = '', currency = 'USD', range = undefined, onRangeChange = undefined } = $props();

  const rangeOptions = [{v:'day',l:'Day'},{v:'week',l:'Week'},{v:'month',l:'Month'},{v:'all',l:'All'}];

  let canvasEl;
  let label = $state('');
  let totalText = $state('');
  let avgText = $state('');
  let isEmpty = $state(true);

  function draw() {
    if (!canvasEl) return;
    const result = renderTrendChart(canvasEl, points, total, average, periodLabel, currency);
    label = result.label;
    totalText = result.totalText;
    avgText = result.avgText;
    isEmpty = result.isEmpty;
  }

  $effect(() => {
    points;
    total;
    average;
    periodLabel;
    currency;
    draw();
  });

  onMount(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => {
      window.removeEventListener('resize', draw);
    };
  });
</script>

<div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm p-6 animate-fade-in">
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2">
      <i class="ph ph-chart-line-up text-blue-600"></i>
      <h2 class="text-lg font-semibold text-slate-800 dark:text-slate-100">Expense Trend</h2>
    </div>
    {#if onRangeChange}
      <div class="flex gap-1">
        {#each rangeOptions as r}
          <button onclick={() => onRangeChange(r.v)}
            class="px-3 py-1 text-xs rounded-lg font-medium transition-colors {range === r.v ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'}">{r.l}</button>
        {/each}
      </div>
    {/if}
  </div>
  {#if !isEmpty}
    <div class="flex items-center gap-4 text-xs mb-2">
      <span class="text-slate-600 dark:text-slate-400">{totalText}</span>
      <span class="text-slate-400 dark:text-slate-500">{avgText}</span>
    </div>
  {/if}
  <canvas bind:this={canvasEl} class="w-full" style="height: 260px"></canvas>
  {#if isEmpty}
    <p class="text-center text-slate-400 dark:text-slate-500 text-sm mt-2">No expense data for {periodLabel || 'this period'}</p>
  {/if}
</div>
