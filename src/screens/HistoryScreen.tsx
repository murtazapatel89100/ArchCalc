import { createSignal, createMemo, For, Show } from "solid-js";
import { Search, Clock, ArrowRight, Trash2 } from "lucide-solid";
import { createLocalStorage } from "../utils/createLocalStorage";
import { HistoryItem } from "./Dashboard";

export function HistoryScreen() {
  const [history, setHistory] = createLocalStorage<HistoryItem[]>("archcalc_history", []);
  const [search, setSearch] = createSignal("");

  const clearHistory = () => {
    if (confirm("Are you sure you want to clear your entire history?")) {
      // @ts-ignore
      setHistory([]);
    }
  };

  const filteredHistory = createMemo(() => {
    if (!search()) return history();
    const lower = search().toLowerCase();
    return history().filter(h => 
      h.expression.toLowerCase().includes(lower) || 
      h.result.toLowerCase().includes(lower) ||
      h.tags.some(t => t.toLowerCase().includes(lower))
    );
  });

  return (
    <div class="flex flex-col h-full max-w-4xl mx-auto w-full p-6 space-y-6 overflow-y-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">History</h1>
          <p class="text-[var(--color-app-text-secondary)] text-sm mt-1">Your recent calculations and conversions.</p>
        </div>
        <button 
          onClick={clearHistory}
          disabled={history().length === 0}
          class="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-[var(--color-app-error)] bg-[var(--color-app-error)]/10 hover:bg-[var(--color-app-error)]/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 size={16} />
          Clear
        </button>
      </div>

      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-[var(--color-app-text-secondary)]">
          <Search size={18} />
        </div>
        <input
          type="text"
          value={search()}
          onInput={(e) => setSearch(e.currentTarget.value)}
          placeholder="Search history..."
          class="w-full bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl pl-11 pr-4 py-3 text-sm text-[var(--color-app-text-primary)] placeholder-[var(--color-app-text-secondary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-app-accent)]/50 shadow-sm"
        />
      </div>

      <div class="space-y-4">
        <Show 
          when={filteredHistory().length > 0} 
          fallback={
            <div class="flex flex-col items-center justify-center py-20 text-[var(--color-app-text-secondary)]">
              <Clock size={48} class="mb-4 opacity-20" />
              <p>{search() ? "No matches found." : "No history yet."}</p>
            </div>
          }
        >
          <For each={filteredHistory()}>
            {(item) => (
              <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-4 flex flex-col gap-3 hover:border-[var(--color-app-accent)]/30 transition-colors group">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-medium px-2 py-0.5 rounded bg-[var(--color-app-surface-secondary)] text-[var(--color-app-text-secondary)] uppercase tracking-wider">{item.tags[0] || 'Unknown'}</span>
                  </div>
                  <span class="text-xs text-[var(--color-app-text-secondary)] font-medium flex items-center gap-1"><Clock size={12}/> {item.time}</span>
                </div>
                
                <div class="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 font-mono">
                  <span class="text-[var(--color-app-text-primary)] font-medium truncate">{item.expression}</span>
                  <ArrowRight size={14} class="text-[var(--color-app-text-secondary)] hidden md:block" />
                  <span class="text-[var(--color-app-success)] font-semibold truncate break-all whitespace-normal md:whitespace-nowrap">{item.result}</span>
                </div>
              </div>
            )}
          </For>
        </Show>
      </div>
    </div>
  );
}
