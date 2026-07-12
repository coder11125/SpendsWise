<script lang="ts">
  import { sendAiMessage, fetchAiQuota } from '../lib/api.js';
  import { getAiChatHistory, setAiChatHistory } from '../lib/state.svelte.js';

  let { show = false, onclose, embedded = false } = $props();

  let active = $derived(embedded || show);

  let messages = $state([]);
  let input = $state('');
  let sending = $state(false);
  let dailyRemaining = $state(50);
  let monthlyRemaining = $state(500);
  let cooldownUntil = $state(0);
  let cooldownTimer = $state(0);
  let cooldownInterval;

  let messagesEl;
  let inputEl;

  $effect(() => {
    if (active) {
      fetchAiQuota().then(q => {
        dailyRemaining = q.dailyRemaining;
        monthlyRemaining = q.monthlyRemaining;
      }).catch(() => {});
      const history = getAiChatHistory();
      if (history.length === 0) {
        messages = [{ role: 'assistant', content: 'New conversation started. What would you like to know about your finances?' }];
      } else {
        messages = [...history];
      }
      setTimeout(() => inputEl?.focus(), 100);
    }
  });

  $effect(() => {
    if (messagesEl) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  });

  function newChat() {
    setAiChatHistory([]);
    messages = [{ role: 'assistant', content: 'New conversation started. What would you like to know about your finances?' }];
  }

  async function send() {
    const text = input.trim();
    if (!text || sending || Date.now() < cooldownUntil) return;
    input = '';
    sending = true;
    messages = [...messages, { role: 'user', content: text }];
    const typingIdx = messages.length;
    messages = [...messages, { role: 'assistant', content: '...' }];
    try {
      const history = getAiChatHistory();
      const res = await sendAiMessage(text, history);
      if (res.dailyRemaining !== undefined) dailyRemaining = res.dailyRemaining;
      if (res.monthlyRemaining !== undefined) monthlyRemaining = res.monthlyRemaining;
      const reply = res.reply || 'Sorry, I could not process that.';
      const newHistory = [...history, { role: 'user', content: text }, { role: 'assistant', content: reply }];
      setAiChatHistory(newHistory);
      messages = [...messages.slice(0, typingIdx), { role: 'assistant', content: reply }];
    } catch (err) {
      const msg = err?.message || 'Network error. Please try again.';
      messages = [...messages.slice(0, typingIdx), { role: 'assistant', content: msg }];
      if (err.status === 429 && err.retryAfter) {
        cooldownUntil = Date.now() + err.retryAfter * 1000;
        cooldownTimer = err.retryAfter;
      }
    } finally {
      sending = false;
    }
  }

  $effect(() => {
    if (cooldownUntil > Date.now()) {
      cooldownInterval = setInterval(() => {
        const remaining = Math.ceil(Math.max(0, cooldownUntil - Date.now()) / 1000);
        cooldownTimer = remaining;
        if (remaining <= 0) {
          clearInterval(cooldownInterval);
          cooldownUntil = 0;
        }
      }, 1000);
      return () => clearInterval(cooldownInterval);
    }
  });

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
</script>

{#snippet panelContent()}
  <div class="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
    <div class="flex items-center gap-2">
      <div class="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center">
        <i class="ph-fill ph-brain text-blue-600 dark:text-blue-400 text-sm"></i>
      </div>
      <div>
        <h2 class="text-sm font-bold text-slate-800 dark:text-slate-100">AI Assistant</h2>
        <p class="text-xs text-slate-500 dark:text-slate-400">Powered by AI</p>
      </div>
    </div>
    <div class="flex items-center gap-1">
      <button onclick={newChat} class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1" title="New chat">
        <i class="ph ph-plus-circle text-lg"></i>
      </button>
      {#if !embedded}
        <button onclick={() => onclose?.()} class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1">
          <i class="ph ph-x text-xl"></i>
        </button>
      {/if}
    </div>
  </div>

  <div bind:this={messagesEl} class="flex-1 overflow-y-auto p-4 space-y-4">
    {#each messages as msg}
      {#if msg.role === 'user'}
        <div class="flex justify-end">
          <div class="bg-blue-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 text-sm max-w-[85%]">{msg.content}</div>
        </div>
      {:else}
        <div class="flex gap-2">
          <div class="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
            <i class="ph-fill ph-brain text-blue-600 dark:text-blue-400 text-sm"></i>
          </div>
          <div class="bg-slate-100 dark:bg-slate-700 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 max-w-[85%] whitespace-pre-wrap">{msg.content}</div>
        </div>
      {/if}
    {/each}
  </div>

  <div class="border-t border-slate-200 dark:border-slate-700 px-4 py-2">
    <div class="flex items-center justify-between text-xs text-slate-400 dark:text-slate-500 mb-2">
      <span>Today: {dailyRemaining} left</span>
      <span>Month: {monthlyRemaining} left</span>
    </div>
    <div class="flex gap-2">
      <input
        bind:this={inputEl}
        type="text"
        bind:value={input}
        onkeydown={handleKeydown}
        placeholder={cooldownTimer > 0 ? `Cooldown ${cooldownTimer}s...` : "Ask about your finances..."}
        disabled={sending || cooldownTimer > 0}
        class="flex-1 px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
      />
      <button
        onclick={send}
        disabled={!input.trim() || sending || cooldownTimer > 0}
        class="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {#if sending}
          <i class="ph ph-spinner animate-spin"></i>
        {:else if cooldownTimer > 0}
          {cooldownTimer}s
        {:else}
          <i class="ph ph-paper-plane-right"></i>
        {/if}
      </button>
    </div>
  </div>
{/snippet}

{#if embedded}
  <div class="h-full flex flex-col bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
    {@render panelContent()}
  </div>
{:else if show}
  <div class="fixed inset-0 z-50 bg-white dark:bg-slate-800 flex flex-col animate-fade-in">
    {@render panelContent()}
  </div>
{/if}
