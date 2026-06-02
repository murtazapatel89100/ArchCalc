import { FileText, Plus, Save, Play } from "lucide-solid";
import { For } from "solid-js";
import { cn } from "../utils/cn";

const workspaces = [
  { id: 1, name: "Personal Budget", active: true },
  { id: 2, name: "Business Expenses", active: false },
  { id: 3, name: "Tax Planning 2024", active: false },
  { id: 4, name: "Project Estimate", active: false },
];

export function WorkspacesScreen() {
  return (
    <div class="flex h-full w-full">
      {/* Workspace Sidebar */}
      <div class="w-64 border-r border-[var(--color-app-border)] bg-[var(--color-app-surface)]/50 flex flex-col">
        <div class="p-4 flex items-center justify-between border-b border-[var(--color-app-border)]">
          <span class="font-semibold text-sm text-[var(--color-app-text-primary)]">Workspaces</span>
          <button class="text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-accent)] transition-colors p-1 hover:bg-[var(--color-app-accent)]/10 rounded">
            <Plus size={16} />
          </button>
        </div>
        <div class="flex-1 overflow-y-auto p-2 space-y-1">
          <For each={workspaces}>
            {(ws) => (
              <button
                class={cn(
                  "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors text-left",
                  ws.active 
                    ? "bg-[var(--color-app-accent)]/10 text-[var(--color-app-accent)] font-medium" 
                    : "text-[var(--color-app-text-secondary)] hover:bg-[var(--color-app-surface-secondary)] hover:text-[var(--color-app-text-primary)]"
                )}
              >
                <FileText size={14} class={ws.active ? "text-[var(--color-app-accent)]" : "text-[var(--color-app-text-secondary)]"} />
                <span class="truncate">{ws.name}</span>
              </button>
            )}
          </For>
        </div>
      </div>

      {/* Editor Area */}
      <div class="flex-1 flex flex-col min-w-0">
        <div class="h-12 border-b border-[var(--color-app-border)] flex items-center justify-between px-4 bg-[var(--color-app-bg)]">
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm text-[var(--color-app-text-secondary)]">workspace / </span>
            <span class="font-medium text-sm text-[var(--color-app-text-primary)]">Personal Budget</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="flex items-center gap-1 text-xs text-[var(--color-app-text-secondary)] mr-4">
              <span class="w-2 h-2 rounded-full bg-[var(--color-app-success)]/80"></span>
              Autosaved
            </div>
            <button class="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--color-app-accent)] text-white rounded-md text-xs font-medium hover:bg-[var(--color-app-accent)]/90 transition-colors shadow-sm">
              <Play size={12} />
              Run All
            </button>
          </div>
        </div>

        <div class="flex-1 flex overflow-hidden bg-[var(--color-app-bg)]">
          {/* Editor */}
          <div class="flex-1 p-6 overflow-y-auto font-mono text-[14px] leading-relaxed relative">
            <div class="absolute left-0 top-0 bottom-0 w-12 bg-[var(--color-app-surface-secondary)]/20 border-r border-[var(--color-app-border)] flex flex-col items-center py-6 text-[var(--color-app-text-secondary)]/50 text-xs font-mono select-none">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
              <span>5</span>
              <span>6</span>
              <span>7</span>
              <span>8</span>
            </div>
            <div class="pl-10 outline-none text-[var(--color-app-text-primary)]" contentEditable={true}>
              <div class="text-[var(--color-app-accent)] font-medium">salary = 50000</div>
              <br />
              <div>rent = 12000</div>
              <br />
              <div>food = 5000</div>
              <br />
              <div><span class="text-[var(--color-app-text-secondary)]">// Calculate remaining</span></div>
              <div class="text-[var(--color-app-warning)]">remaining = salary - rent - food</div>
            </div>
          </div>

          {/* Live Results Panel */}
          <div class="w-80 border-l border-[var(--color-app-border)] bg-[var(--color-app-surface)]/30 p-6 overflow-y-auto font-mono text-[14px] leading-relaxed">
            <div class="text-[var(--color-app-text-secondary)] mb-4 text-xs uppercase tracking-wider font-sans font-semibold">Live Results</div>
            <div class="space-y-6">
              <div class="flex items-center justify-between group">
                <span class="text-[var(--color-app-text-secondary)]/70">salary</span>
                <span class="text-[var(--color-app-text-primary)] font-medium">50,000</span>
              </div>
              
              <div class="flex items-center justify-between group">
                <span class="text-[var(--color-app-text-secondary)]/70">rent</span>
                <span class="text-[var(--color-app-text-primary)] font-medium">12,000</span>
              </div>
              
              <div class="flex items-center justify-between group">
                <span class="text-[var(--color-app-text-secondary)]/70">food</span>
                <span class="text-[var(--color-app-text-primary)] font-medium">5,000</span>
              </div>
              
              <div class="h-px bg-[var(--color-app-border)]/50 my-2"></div>
              
              <div class="flex items-center justify-between group">
                <span class="text-[var(--color-app-accent)] font-medium">remaining</span>
                <span class="text-[var(--color-app-success)] font-semibold text-lg">33,000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
