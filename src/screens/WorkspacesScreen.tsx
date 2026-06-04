import { FileText, Plus, Save, Play, Trash, X } from "lucide-solid";
import { For, createSignal, createEffect, Show } from "solid-js";
import { cn } from "../utils/cn";
import { createLocalStorage } from "../utils/createLocalStorage";
import { evaluator } from "../utils/evaluator";

interface Workspace {
  id: string;
  name: string;
  content: string;
}

interface LiveResult {
  lineIndex: number;
  variable?: string;
  value: string;
  isError: boolean;
}

export function WorkspacesScreen() {
  const [workspaces, setWorkspaces] = createLocalStorage<Workspace[]>("archcalc_workspaces", [
    { id: "1", name: "Personal Budget", content: "salary = 50000\nrent = 12000\nfood = 5000\n// Calculate remaining\nremaining = salary - rent - food" }
  ]);
  const [activeId, setActiveId] = createSignal<string>("1");
  const [results, setResults] = createSignal<LiveResult[]>([]);

  const activeWorkspace = () => workspaces().find(w => w.id === activeId());

  const [showModal, setShowModal] = createSignal(false);
  const [newWorkspaceName, setNewWorkspaceName] = createSignal("");
  let nameInputRef!: HTMLInputElement;

  const addWorkspace = () => {
    setNewWorkspaceName("");
    setShowModal(true);
    setTimeout(() => nameInputRef?.focus(), 50);
  };

  const confirmAddWorkspace = (e?: Event) => {
    if (e) e.preventDefault();
    if (!newWorkspaceName().trim()) return;
    const newId = crypto.randomUUID();
    setWorkspaces([...workspaces(), { id: newId, name: newWorkspaceName().trim(), content: "" }]);
    setActiveId(newId);
    setShowModal(false);
  };

  const removeWorkspace = (id: string, e: Event) => {
    e.stopPropagation();
    const filtered = workspaces().filter(w => w.id !== id);
    setWorkspaces(filtered);
    if (activeId() === id) {
      setActiveId(filtered.length > 0 ? filtered[0].id : "");
    }
  };

  const updateContent = (content: string) => {
    const w = activeWorkspace();
    if (!w) return;
    setWorkspaces(workspaces().map(ws => ws.id === w.id ? { ...ws, content } : ws));
  };

  const updateName = (name: string) => {
    const w = activeWorkspace();
    if (!w) return;
    setWorkspaces(workspaces().map(ws => ws.id === w.id ? { ...ws, name } : ws));
  };

  // Evaluate lines whenever content changes
  createEffect(() => {
    const w = activeWorkspace();
    if (!w) {
      setResults([]);
      return;
    }
    
    const lines = w.content.split('\n');
    const newResults: LiveResult[] = [];
    const context: Record<string, number> = {};

    lines.forEach((line, i) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('//')) return;

      try {
        let varName: string | undefined;
        let exprToEval = trimmed;

        // Check for assignment: var = expression
        const assignMatch = trimmed.match(/^([a-zA-Z_]\w*)\s*=\s*(.*)$/);
        if (assignMatch) {
          varName = assignMatch[1];
          exprToEval = assignMatch[2];
        }

        const valStr = evaluator.math(exprToEval, context);
        const valNum = parseFloat(valStr);

        if (varName && !isNaN(valNum)) {
          context[varName] = valNum;
        }

        newResults.push({
          lineIndex: i,
          variable: varName,
          value: parseFloat(valNum.toPrecision(12)).toLocaleString("en-US", { maximumFractionDigits: 4 }),
          isError: false
        });
      } catch (err) {
        // Skip errors or mark them
      }
    });

    setResults(newResults);
  });

  return (
    <div class="flex h-full w-full">
      {/* Workspace Sidebar */}
      <div class="w-64 border-r border-[var(--color-app-border)] bg-[var(--color-app-surface)]/50 flex flex-col">
        <div class="p-4 flex items-center justify-between border-b border-[var(--color-app-border)]">
          <span class="font-semibold text-sm text-[var(--color-app-text-primary)]">Workspaces</span>
          <button onClick={addWorkspace} class="text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-accent)] transition-colors p-1 hover:bg-[var(--color-app-accent)]/10 rounded">
            <Plus size={16} />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <For each={workspaces()}>
            {(ws) => (
              <button
                onClick={() => setActiveId(ws.id)}
                class={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors text-left group",
                  ws.id === activeId()
                    ? "bg-[var(--color-app-accent)]/10 text-[var(--color-app-accent)] font-medium" 
                    : "text-[var(--color-app-text-secondary)] hover:bg-[var(--color-app-surface-secondary)] hover:text-[var(--color-app-text-primary)]"
                )}
              >
                <div class="flex items-center gap-2 overflow-hidden">
                  <FileText size={14} class={ws.id === activeId() ? "text-[var(--color-app-accent)]" : "text-[var(--color-app-text-secondary)]"} />
                  <span class="truncate">{ws.name}</span>
                </div>
                <div 
                  onClick={(e) => removeWorkspace(ws.id, e)}
                  class="opacity-0 group-hover:opacity-100 p-1 hover:text-[var(--color-app-error)] transition-colors rounded-md"
                >
                  <Trash size={12} />
                </div>
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Editor Area */}
      <Show when={activeWorkspace()} fallback={
        <div class="flex-1 flex items-center justify-center text-[var(--color-app-text-secondary)]">
          No workspace selected
        </div>
      }>
        <div class="flex-1 flex flex-col min-w-0">
          <div class="h-12 border-b border-[var(--color-app-border)] flex items-center justify-between px-4 bg-[var(--color-app-bg)]">
            <div class="flex items-center gap-2">
              <span class="font-mono text-sm text-[var(--color-app-text-secondary)]">workspace / </span>
              <input 
                type="text" 
                value={activeWorkspace()?.name || ""}
                onInput={(e) => updateName(e.currentTarget.value)}
                class="bg-transparent font-medium text-sm text-[var(--color-app-text-primary)] focus:outline-none focus:border-b focus:border-[var(--color-app-accent)]"
              />
            </div>
            <div class="flex items-center gap-2">
              <div class="flex items-center gap-1 text-xs text-[var(--color-app-text-secondary)] mr-4">
                <span class="w-2 h-2 rounded-full bg-[var(--color-app-success)]/80"></span>
                Autosaved
              </div>
            </div>
          </div>

          <div class="flex-1 flex overflow-hidden bg-[var(--color-app-bg)]">
            {/* Editor */}
            <div class="flex-1 p-6 relative font-mono text-[14px] leading-relaxed flex">
              <div class="w-12 bg-[var(--color-app-surface-secondary)]/20 border-r border-[var(--color-app-border)] flex flex-col items-center pt-2 text-[var(--color-app-text-secondary)]/50 text-xs font-mono select-none">
                <For each={activeWorkspace()?.content.split('\n')}>
                  {(_, i) => <span>{i() + 1}</span>}
                </For>
              </div>
              <textarea
                class="flex-1 h-full resize-none bg-transparent text-[var(--color-app-text-primary)] pl-4 pt-1 outline-none leading-relaxed whitespace-pre"
                value={activeWorkspace()?.content || ""}
                onInput={(e) => updateContent(e.currentTarget.value)}
                spellcheck={false}
              />
            </div>

            {/* Live Results Panel */}
            <div class="w-80 border-l border-[var(--color-app-border)] bg-[var(--color-app-surface)]/30 p-6 overflow-y-auto font-mono text-[14px] leading-relaxed">
              <div class="text-[var(--color-app-text-secondary)] mb-4 text-xs uppercase tracking-wider font-sans font-semibold">Live Results</div>
              <div class="space-y-6">
                <For each={results()}>
                  {(res) => (
                    <div class="flex items-center justify-between group border-b border-[var(--color-app-border)]/50 pb-2">
                      <span class="text-[var(--color-app-text-secondary)]/70">{res.variable || `Line ${res.lineIndex + 1}`}</span>
                      <span class="text-[var(--color-app-accent)] font-medium text-lg">{res.value}</span>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </div>
        </div>
      </Show>

      {/* Modal Overlay */}
      <Show when={showModal()}>
        <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl w-full max-w-sm shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div class="flex items-center justify-between p-4 border-b border-[var(--color-app-border)]">
              <h3 class="font-semibold text-[var(--color-app-text-primary)]">New Workspace</h3>
              <button 
                onClick={() => setShowModal(false)}
                class="text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-text-primary)] transition-colors p-1 rounded-md hover:bg-[var(--color-app-surface-secondary)]"
              >
                <X size={16} />
              </button>
            </div>
            <form onSubmit={confirmAddWorkspace} class="p-4 space-y-4">
              <div class="space-y-2">
                <label class="text-sm font-medium text-[var(--color-app-text-secondary)]">Workspace Name</label>
                <input 
                  ref={nameInputRef}
                  type="text" 
                  value={newWorkspaceName()}
                  onInput={(e) => setNewWorkspaceName(e.currentTarget.value)}
                  placeholder="e.g. Personal Budget"
                  class="w-full bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-app-text-primary)] placeholder-[var(--color-app-text-secondary)] focus:outline-none focus:border-[var(--color-app-accent)]"
                />
              </div>
              <div class="flex items-center justify-end gap-2 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  class="px-4 py-2 rounded-lg text-sm font-medium text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-text-primary)] hover:bg-[var(--color-app-surface-secondary)] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!newWorkspaceName().trim()}
                  class="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--color-app-accent)] text-white hover:bg-[var(--color-app-accent)]/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      </Show>
    </div>
  );
}
