<script lang="ts">
  import { fetchSummaries } from '../lib/api.js';
  import { getCurrentCurrency } from '../lib/state.svelte.js';
  import { getCurrencySymbol } from '../lib/currency.js';
  import PieChart from '../components/PieChart.svelte';
  import type { WeeklySummary } from '../types.js';

  let summaries = $state<WeeklySummary[]>([]);
  let loading = $state(true);
  let error = $state('');

  $effect(() => {
    loading = true;
    error = '';
    fetchSummaries()
      .then((res) => { summaries = res.summaries ?? []; })
      .catch((err) => { error = err.message || 'Failed to load summaries.'; })
      .finally(() => { loading = false; });
  });

  function formatRange(start: string, end: string): string {
    const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const s = new Date(`${start}T00:00:00`);
    const e = new Date(`${end}T00:00:00`);
    return `${s.toLocaleDateString(undefined, opts)} – ${e.toLocaleDateString(undefined, { ...opts, year: 'numeric' })}`;
  }

  function weekOverWeekChange(summary: WeeklySummary): { pct: string; up: boolean } | null {
    const prev = summary.stats.previousWeekExpense;
    if (prev === null || prev === undefined || prev === 0) return null;
    const diff = summary.stats.totalExpense - prev;
    return { pct: Math.abs((diff / prev) * 100).toFixed(1), up: diff >= 0 };
  }

  function narrativeParagraphs(narrative: string): string[] {
    return narrative.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  }

  function categoryChartData(summary: WeeklySummary) {
    const total = summary.stats.totalExpense;
    return summary.stats.byCategory.map((c) => ({
      category: c.category,
      amount: c.amount,
      percentage: total > 0 ? (c.amount / total) * 100 : 0,
    }));
  }
</script>

<div class="w-full space-y-4">
  <div class="flex items-center gap-2 mb-2">
    <i class="ph ph-newspaper text-blue-600 text-xl"></i>
    <div>
      <h1 class="text-lg font-bold text-slate-800 dark:text-slate-100">Weekly Summaries</h1>
      <p class="text-sm text-slate-500 dark:text-slate-400">A detailed look at your spending, generated automatically once each week wraps up.</p>
    </div>
  </div>

  {#if loading}
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-10 flex flex-col items-center justify-center gap-3">
      <i class="ph ph-circle-notch animate-spin text-2xl text-blue-500"></i>
      <p class="text-sm text-slate-500 dark:text-slate-400">Checking for a new summary…</p>
    </div>
  {:else if error}
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
      <p class="text-sm text-rose-600">{error}</p>
    </div>
  {:else if summaries.length === 0}
    <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-10 text-center">
      <i class="ph ph-newspaper text-3xl text-slate-300 dark:text-slate-600 mb-3"></i>
      <p class="text-sm text-slate-500 dark:text-slate-400">No summaries yet. Once a full week (Monday–Sunday) with at least one transaction has passed, your first summary will show up here.</p>
    </div>
  {:else}
    {#each summaries as summary (summary.weekStartDate)}
      {@const change = weekOverWeekChange(summary)}
      <div class="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-5">
        <div class="flex items-start justify-between flex-wrap gap-2">
          <h2 class="text-base font-semibold text-slate-800 dark:text-slate-100">{formatRange(summary.weekStartDate, summary.weekEndDate)}</h2>
          {#if change}
            <span class="text-xs font-medium px-2 py-1 rounded-full {change.up ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20'}">
              <i class="ph {change.up ? 'ph-trend-up' : 'ph-trend-down'} mr-1"></i>
              {change.pct}% vs previous week
            </span>
          {/if}
        </div>

        <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div class="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <p class="text-xs text-slate-500 dark:text-slate-400">Income</p>
            <p class="text-base font-bold text-emerald-600">{getCurrencySymbol(getCurrentCurrency())}{summary.stats.totalIncome.toFixed(2)}</p>
          </div>
          <div class="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <p class="text-xs text-slate-500 dark:text-slate-400">Expenses</p>
            <p class="text-base font-bold text-rose-600">{getCurrencySymbol(getCurrentCurrency())}{summary.stats.totalExpense.toFixed(2)}</p>
          </div>
          <div class="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <p class="text-xs text-slate-500 dark:text-slate-400">Net</p>
            <p class="text-base font-bold {summary.stats.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}">{getCurrencySymbol(getCurrentCurrency())}{summary.stats.net.toFixed(2)}</p>
          </div>
          <div class="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
            <p class="text-xs text-slate-500 dark:text-slate-400">Transactions</p>
            <p class="text-base font-bold text-slate-800 dark:text-slate-100">{summary.stats.transactionCount}</p>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div class="space-y-3 text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
            {#each narrativeParagraphs(summary.narrative) as para}
              <p class="whitespace-pre-line">{para}</p>
            {/each}
          </div>
          {#if summary.stats.byCategory.length > 0}
            <PieChart categoryData={categoryChartData(summary)} total={summary.stats.totalExpense} currency={getCurrentCurrency()} />
          {/if}
        </div>
      </div>
    {/each}
  {/if}
</div>
