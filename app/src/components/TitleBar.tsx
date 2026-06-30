import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-solid";
import { createSignal, onCleanup, onMount } from "solid-js";

const appWindow = getCurrentWindow();

export function TitleBar() {
  const [isMaximized, setIsMaximized] = createSignal(false);

  onMount(async () => {
    setIsMaximized(await appWindow.isMaximized());
    const unlisten = await appWindow.onResized(async () => {
      setIsMaximized(await appWindow.isMaximized());
    });
    onCleanup(() => unlisten());
  });

  return (
    <header
      data-tauri-drag-region
      class="flex h-9 shrink-0 items-center justify-between border-b border-[var(--color-app-border)] bg-[var(--color-app-surface)] pl-3 select-none"
    >
      <div
        data-tauri-drag-region
        class="flex items-center gap-2 text-xs font-medium text-[var(--color-app-text-secondary)]"
      >
        <div class="flex h-4 w-4 items-center justify-center rounded bg-[var(--color-app-accent)] text-[10px] text-white">
          Λ
        </div>
        ArchCalc
      </div>

      <div class="flex h-full items-center">
        <button
          type="button"
          aria-label="Minimize"
          onClick={() => appWindow.minimize()}
          class="flex h-full w-11 items-center justify-center text-[var(--color-app-text-secondary)] transition-colors hover:bg-[var(--color-app-surface-secondary)] hover:text-[var(--color-app-text-primary)]"
        >
          <Minus size={15} />
        </button>
        <button
          type="button"
          aria-label={isMaximized() ? "Restore" : "Maximize"}
          onClick={() => appWindow.toggleMaximize()}
          class="flex h-full w-11 items-center justify-center text-[var(--color-app-text-secondary)] transition-colors hover:bg-[var(--color-app-surface-secondary)] hover:text-[var(--color-app-text-primary)]"
        >
          <Square size={isMaximized() ? 11 : 13} />
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={() => appWindow.close()}
          class="flex h-full w-11 items-center justify-center text-[var(--color-app-text-secondary)] transition-colors hover:bg-[var(--color-app-error)] hover:text-white"
        >
          <X size={16} />
        </button>
      </div>
    </header>
  );
}
