import { Check, Copy, Terminal } from "lucide-solid";
import { createEffect, createSignal, onCleanup, onMount, Show } from "solid-js";
import { Transition } from "solid-transition-group";
import { cn } from "../utils/cn";
import { createLocalStorage } from "../utils/createLocalStorage";
import { type EvalResult, evaluator } from "../utils/evaluator";

export interface HistoryItem {
  id: string;
  title: string;
  expression: string;
  result: string;
  tags: string[];
  time: string;
  timestamp: number;
}

export function Dashboard() {
  const [query, setQuery] = createSignal("");
  const [isFocused, setIsFocused] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  const [evalResult, setEvalResult] = createSignal<EvalResult | null>(null);
  let inputRef!: HTMLInputElement;

  const [history, setHistory] = createLocalStorage<HistoryItem[]>(
    "archcalc_history",
    [],
  );
  const [historyIndex, setHistoryIndex] = createSignal(-1);
  const [retentionDays] = createLocalStorage<number>(
    "archcalc_history_retention",
    30,
  );

  onMount(() => {
    inputRef?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef) {
        e.preventDefault();
        inputRef?.focus();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });

  createEffect(() => {
    const q = query();
    let isCancelled = false;
    evaluator.process(q).then((res) => {
      if (!isCancelled) setEvalResult(res);
    });
    onCleanup(() => {
      isCancelled = true;
    });
  });

  const handleCopy = () => {
    const res = evalResult();
    if (res?.value) {
      navigator.clipboard.writeText(res.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    const res = evalResult();
    const q = query();
    const h = history();
    const hIdx = historyIndex();

    if (e.key === "Enter" && q.trim()) {
      e.preventDefault();
      evaluator.process(q).then((finalRes) => {
        if (finalRes && finalRes.type !== "error") {
          const now = new Date();
          const newItem: HistoryItem = {
            id: crypto.randomUUID(),
            title: getTitleForQuery(q, finalRes.type),
            expression: q,
            result: finalRes.value,
            tags: [
              finalRes.type === "calc"
                ? "Calculation"
                : finalRes.type === "conv"
                  ? "Conversion"
                  : "Developer",
            ],
            time: now.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            timestamp: now.getTime(),
          };

          const retention = retentionDays();
          let newHistory = [newItem, ...history()];
          if (retention > 0) {
            const cutoff = now.getTime() - retention * 24 * 60 * 60 * 1000;
            newHistory = newHistory.filter((item) => item.timestamp > cutoff);
          }

          setHistory(newHistory);
          setQuery("");
          setHistoryIndex(-1);
          setEvalResult(null);
        }
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (h.length > 0) {
        const nextIdx = Math.min(hIdx + 1, h.length - 1);
        setHistoryIndex(nextIdx);
        setQuery(h[nextIdx].expression);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (hIdx > 0) {
        const prevIdx = hIdx - 1;
        setHistoryIndex(prevIdx);
        setQuery(h[prevIdx].expression);
      } else if (hIdx === 0) {
        setHistoryIndex(-1);
        setQuery("");
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setQuery("");
      setHistoryIndex(-1);
    }
  };

  const getTitleForQuery = (q: string, type: string) => {
    if (type === "calc") return "Calculation";
    if (type === "conv") return "Conversion";
    if (q.toLowerCase().startsWith("uuid")) return "UUID Generator";
    if (q.toLowerCase().startsWith("sha")) return "Hash Generator";
    if (q.toLowerCase().startsWith("base64")) return "Base64";
    if (
      q.toLowerCase().includes("now") ||
      q.toLowerCase().includes("timestamp")
    )
      return "Timestamp";
    return "Developer Tool";
  };

  const resultText = () => {
    const res = evalResult();
    const q = query();
    return res ? res.value : q ? `Evaluating: ${q}...` : "";
  };
  const isError = () => evalResult()?.type === "error";

  return (
    <div class="flex flex-col h-full w-full">
      {/* Topbar */}
      <header class="h-14 flex items-center justify-between px-6 border-b border-[var(--color-app-border)] bg-[var(--color-app-surface)]/50 backdrop-blur-md sticky top-0 z-10">
        <div class="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="ArchCalc"
            class="w-7 h-7 rounded object-contain shadow-lg shadow-[var(--color-app-accent)]/20 bg-[var(--color-app-surface)]"
          />
          <span class="font-semibold text-[var(--color-app-text-primary)]">
            ArchCalc
          </span>
        </div>
        <div class="flex-1 max-w-md mx-6 hidden md:block relative"></div>
      </header>

      {/* Main Content */}
      <div class="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center">
        <div class="w-full max-w-3xl flex flex-col gap-8 mt-10">
          {/* Main Command Input */}
          <div
            class={cn(
              "relative rounded-2xl bg-[var(--color-app-surface)] border transition-all duration-300 shadow-2xl",
              isFocused()
                ? "border-[var(--color-app-accent)] shadow-[var(--color-app-accent)]/10"
                : "border-[var(--color-app-border)] shadow-black/20",
            )}
          >
            <div class="flex items-center px-6 py-5">
              <Terminal
                size={24}
                class={cn(
                  "mr-4 transition-colors",
                  isFocused()
                    ? "text-[var(--color-app-accent)]"
                    : "text-[var(--color-app-text-secondary)]",
                )}
              />
              <input
                ref={inputRef}
                type="text"
                value={query()}
                onInput={(e) => {
                  setQuery(e.currentTarget.value);
                  setHistoryIndex(-1);
                }}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                placeholder="Type a calculation, conversion or command..."
                class="flex-1 bg-transparent text-xl md:text-2xl font-medium text-[var(--color-app-text-primary)] placeholder-[var(--color-app-text-secondary)]/40 focus:outline-none"
              />
              <div class="flex gap-2">
                <kbd class="hidden sm:inline-flex items-center justify-center px-2 py-1 text-xs font-medium text-[var(--color-app-text-secondary)] bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] rounded">
                  Enter
                </kbd>
              </div>
            </div>

            {/* Live Result Panel */}
            <Transition
              onEnter={(el, done) => {
                const a = el.animate(
                  [
                    { height: 0, opacity: 0 },
                    { height: `${el.scrollHeight}px`, opacity: 1 },
                  ],
                  { duration: 200 },
                );
                a.finished.then(done);
              }}
              onExit={(el, done) => {
                const a = el.animate(
                  [
                    { height: `${el.scrollHeight}px`, opacity: 1 },
                    { height: 0, opacity: 0 },
                  ],
                  { duration: 200 },
                );
                a.finished.then(done);
              }}
            >
              <Show when={query() && evalResult()}>
                <div class="border-t border-[var(--color-app-border)] overflow-hidden">
                  <div class="px-6 py-5 flex items-center justify-between bg-[var(--color-app-surface-secondary)]/30 rounded-b-2xl">
                    <div class="flex flex-col flex-1 min-w-0 mr-4">
                      <span class="text-sm font-mono text-[var(--color-app-text-secondary)] mb-1">
                        Result
                      </span>
                      <span
                        class={cn(
                          "text-3xl font-semibold tracking-tight truncate",
                          isError()
                            ? "text-[var(--color-app-error)]"
                            : "text-[var(--color-app-success)]",
                        )}
                      >
                        {resultText()}
                      </span>
                    </div>
                    <Show when={!isError()}>
                      <button
                        onClick={handleCopy}
                        class="p-3 shrink-0 rounded-xl bg-[var(--color-app-surface)] border border-[var(--color-app-border)] hover:bg-[var(--color-app-border)] text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-text-primary)] transition-all flex items-center gap-2 shadow-sm"
                      >
                        <Show when={copied()} fallback={<Copy size={18} />}>
                          <Check
                            size={18}
                            class="text-[var(--color-app-success)]"
                          />
                        </Show>
                        <span class="text-sm font-medium">
                          {copied() ? "Copied" : "Copy"}
                        </span>
                      </button>
                    </Show>
                  </div>
                </div>
              </Show>
            </Transition>
          </div>

          {/* Suggestions / Recent */}
          <div
            class="flex flex-col gap-4 transition-all duration-300"
            style={{ opacity: 1, transform: "translateY(0)" }}
          >
            <h3 class="text-sm font-medium text-[var(--color-app-text-secondary)] px-2">
              Recent & Suggestions
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: "1200 * 15", desc: "Calculation", type: "calc" },
                { label: "uuid", desc: "Generator", type: "dev" },
                { label: "sha256 password", desc: "Hash", type: "dev" },
                {
                  label: "100 gb in mb",
                  desc: "Data Conversion",
                  type: "conv",
                },
                { label: "15% of 5000", desc: "Percentage", type: "calc" },
                { label: "now", desc: "Timestamp", type: "dev" },
              ].map((item, _idx) => (
                <button
                  onClick={() => {
                    setQuery(item.label);
                    inputRef?.focus();
                  }}
                  class="flex items-center justify-between p-4 rounded-xl bg-[var(--color-app-surface)] border border-[var(--color-app-border)] hover:border-[var(--color-app-accent)]/50 hover:bg-[var(--color-app-surface-secondary)] transition-all group text-left"
                >
                  <div class="flex flex-col">
                    <span class="text-base font-medium text-[var(--color-app-text-primary)] group-hover:text-[var(--color-app-accent)] transition-colors">
                      {item.label}
                    </span>
                    <span class="text-xs text-[var(--color-app-text-secondary)] mt-1">
                      {item.desc}
                    </span>
                  </div>
                  <div class="w-8 h-8 rounded-lg bg-[var(--color-app-surface-secondary)] group-hover:bg-[var(--color-app-surface)] flex items-center justify-center text-[var(--color-app-text-secondary)] group-hover:text-[var(--color-app-accent)] transition-colors">
                    <ArrowRightIcon size={14} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArrowRightIcon(props: { size: number }) {
  return (
    <svg
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <line x1="5" y1="12" x2="19" y2="12"></line>
      <polyline points="12 5 19 12 12 19"></polyline>
    </svg>
  );
}
