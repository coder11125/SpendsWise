<script>
  import { onMount } from 'svelte';
  import { renderPieChart } from '../lib/charts.js';

  let { categoryData = [], total = 0, currency = 'USD' } = $props();

  let canvasEl;
  let legendHtml = $state('');

  function draw() {
    if (!canvasEl) return;
    const result = renderPieChart(canvasEl, categoryData, total, currency);
    legendHtml = result.legendHtml;
  }

  $effect(() => {
    categoryData;
    total;
    currency;
    draw();
  });

  onMount(() => {
    draw();
  });
</script>

<div class="bg-white rounded-xl shadow-sm p-6 animate-fade-in">
  <div class="flex items-center gap-2 mb-4">
    <i class="ph ph-chart-pie-slice text-blue-600"></i>
    <h2 class="text-lg font-semibold text-slate-800">Expense Breakdown</h2>
  </div>
  <div class="flex flex-col items-center">
    <canvas bind:this={canvasEl} class="max-w-full"></canvas>
    {#if legendHtml}
      <div class="mt-4 w-full space-y-2">
        {@html legendHtml}
      </div>
    {:else if categoryData.length === 0}
      <p class="text-slate-400 text-sm mt-4">No expense data for this period</p>
    {/if}
  </div>
</div>
