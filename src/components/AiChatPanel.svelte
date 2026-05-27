<script>
  import { sendAiMessage } from '../lib/api.js';
  import { getAiChatHistory, setAiChatHistory } from '../lib/state.svelte.js';

  let { show, onclose } = $props();

  let messages = $state([]);
  let input = $state('');
  let sending = $state(false);
  let dailyRemaining = $state(50);
  let monthlyRemaining = $state(500);

  let messagesEl;
  let inputEl;

  $effect(() => {
    if (show) {
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
    if (!text || sending) return;
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
    } finally {
      sending = false;
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }
</script>

{#if show}
<div class="fixed inset-0 z-50 flex justify-end animate-fade-in" onclick={(e) => { if (e.target === e.currentTarget) onclose?.(); }}>
  <div onclick={(e) => e.stopPropagation()} class="w-full max-w-sm bg-white h-full shadow-2xl flex flex-col translate-x-0 transition-transform duration-300">
    <div class="flex items-center justify-between p-4 border-b border-slate-200">
      <div class="flex items-center gap-2">
        <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center">
          <i class="ph-fill ph-brain text-indigo-600 text-sm"></i>
        </div>
        <div>
          <h2 class="text-sm font-bold text-slate-800">AI Assistant</h2>
          <p class="text-xs text-slate-500">Powered by AI</p>
        </div>
      </div>
      <div class="flex items-center gap-1">
        <button onclick={newChat} class="text-slate-400 hover:text-slate-600 transition-colors p-1" title="New chat">
          <i class="ph ph-plus-circle text-lg"></i>
        </button>
        <button onclick={() => onclose?.()} class="text-slate-400 hover:text-slate-600 transition-colors p-1">
          <i class="ph ph-x text-xl"></i>
        </button>
      </div>
    </div>

    <div bind:this={messagesEl} class="flex-1 overflow-y-auto p-4 space-y-4">
      {#each messages as msg}
        {#if msg.role === 'user'}
          <div class="flex justify-end">
            <div class="bg-indigo-600 text-white rounded-2xl rounded-tr-none px-4 py-2.5 text-sm max-w-[85%]">{msg.content}</div>
          </div>
        {:else}
          <div class="flex gap-2">
            <div class="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <i class="ph-fill ph-brain text-indigo-600 text-sm"></i>
            </div>
            <div class="bg-slate-100 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm text-slate-700 max-w-[85%] whitespace-pre-wrap">{msg.content}</div>
          </div>
        {/if}
      {/each}
    </div>

    <div class="border-t border-slate-200 px-4 py-2">
      <div class="flex items-center justify-between text-xs text-slate-400 mb-2">
        <span>Today: {dailyRemaining} left</span>
        <span>Month: {monthlyRemaining} left</span>
      </div>
      <div class="flex gap-2">
        <input
          bind:this={inputEl}
          type="text"
          bind:value={input}
          onkeydown={handleKeydown}
          placeholder="Ask about your finances..."
          disabled={sending}
          class="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
        />
        <button
          onclick={send}
          disabled={!input.trim() || sending}
          class="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {#if sending}
            <i class="ph ph-spinner animate-spin"></i>
          {:else}
            <i class="ph ph-paper-plane-right"></i>
          {/if}
        </button>
      </div>
    </div>
  </div>
</div>
{/if}
