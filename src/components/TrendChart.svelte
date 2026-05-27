<script>
  import { onMount } from 'svelte';
  import { renderTrendChart } from '../lib/charts.js';

  let { points = [], total = 0, average = 0, periodLabel = '', currency = 'USD' } = $props();

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

<div class="bg-white rounded-xl shadow-sm p-6 animate-fade-in">
  <div class="flex items-center justify-between mb-4">
    <div class="flex items-center gap-2">
      <i class="ph ph-chart-line-up text-blue-600"></i>
      <h2 class="text-lg font-semibold text-slate-800">Expense Trend</h2>
    </div>
    {#if !isEmpty}
      <div class="flex items-center gap-4 text-xs">
        <span class="text-slate-600">{totalText}</span>
        <span class="text-slate-400">{avgText}</span>
      </div>
    {/if}
  </div>
  <canvas bind:this={canvasEl} class="w-full" style="height: 260px"></canvas>
  {#if isEmpty}
    <p class="text-center text-slate-400 text-sm mt-2">No expense data for {periodLabel || 'this period'}</p>
  {/if}
</div>
