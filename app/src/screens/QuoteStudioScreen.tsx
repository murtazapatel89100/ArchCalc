import { ArrowLeft, Settings2 } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Button } from "../components/ui";
import { builders, getBuilder } from "../features/quotes/builders";
import { QuoteSettingsModal } from "../features/quotes/components/QuoteSettingsModal";
import { QuoteWorkspace } from "../features/quotes/components/QuoteWorkspace";
import { products } from "../features/quotes/store";

export function QuoteStudioScreen() {
  const [activeBuilderId, setActiveBuilderId] = createSignal<string | null>(
    null,
  );
  const [settingsOpen, setSettingsOpen] = createSignal(false);
  const activeBuilder = () => {
    const id = activeBuilderId();
    return id ? getBuilder(id) : undefined;
  };
  const productCount = (builderId: string) =>
    products.filter((p) => p.builderId === builderId).length;

  return (
    <div class="flex flex-col h-full max-w-6xl mx-auto w-full p-6 space-y-6 overflow-y-auto">
      <Show
        when={activeBuilder()}
        fallback={
          <>
            <div class="flex items-center justify-between mb-4">
              <div>
                <h1 class="text-2xl font-semibold tracking-tight">
                  Quote Studio
                </h1>
                <p class="text-[var(--color-app-text-secondary)] text-sm mt-1">
                  Cost out what you make or sell, save quotes per product, and
                  export them as PDF or Word.
                </p>
              </div>
              <Button size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings2 size={14} /> Quote settings
              </Button>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <For each={builders}>
                {(b) => (
                  <BuilderCard
                    name={b.name}
                    desc={b.desc}
                    icon={b.icon}
                    count={productCount(b.id)}
                    onClick={() => setActiveBuilderId(b.id)}
                  />
                )}
              </For>
            </div>
          </>
        }
      >
        {(builder) => (
          <div class="flex flex-col">
            <div class="flex items-center gap-4 mb-6 pb-4 border-b border-[var(--color-app-border)]">
              <button
                onClick={() => setActiveBuilderId(null)}
                aria-label="Back to Quote Studio"
                class="p-2 rounded-lg bg-[var(--color-app-surface-secondary)] hover:bg-[var(--color-app-border)] text-[var(--color-app-text-primary)] transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div class="flex items-center gap-3 flex-1">
                <div class="w-8 h-8 rounded bg-[var(--color-app-accent)]/20 text-[var(--color-app-accent)] flex items-center justify-center">
                  <Dynamic component={builder().icon} size={16} />
                </div>
                <div>
                  <h1 class="text-xl font-semibold tracking-tight">
                    {builder().name}
                  </h1>
                  <p class="text-xs text-[var(--color-app-text-secondary)]">
                    {builder().desc}
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => setSettingsOpen(true)}>
                <Settings2 size={14} /> Settings
              </Button>
            </div>
            {/* Keyed so switching builders resets the selected product/quote. */}
            <Show when={builder().id} keyed>
              <QuoteWorkspace builder={builder()} />
            </Show>
          </div>
        )}
      </Show>
      <QuoteSettingsModal
        open={settingsOpen()}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  );
}

function BuilderCard(props: {
  name: string;
  desc: string;
  icon: any;
  count: number;
  onClick: () => void;
}) {
  return (
    <div
      onClick={props.onClick}
      class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 flex flex-col items-start gap-4 hover:border-[var(--color-app-accent)]/50 hover:shadow-md transition-all group cursor-pointer relative overflow-hidden"
    >
      <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-app-accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div class="relative w-full flex items-start justify-between">
        <div class="w-10 h-10 rounded-lg bg-[var(--color-app-surface-secondary)] flex items-center justify-center text-[var(--color-app-text-secondary)] group-hover:bg-[var(--color-app-accent)]/20 group-hover:text-[var(--color-app-accent)] transition-colors">
          <Dynamic component={props.icon} size={20} />
        </div>
        <Show when={props.count > 0}>
          <span class="text-[11px] px-2 py-0.5 rounded-full bg-[var(--color-app-surface-secondary)] text-[var(--color-app-text-secondary)]">
            {props.count} {props.count === 1 ? "product" : "products"}
          </span>
        </Show>
      </div>

      <div class="relative flex flex-col gap-1 w-full">
        <span class="font-medium text-[var(--color-app-text-primary)]">
          {props.name}
        </span>
        <span class="text-xs text-[var(--color-app-text-secondary)]">
          {props.desc}
        </span>
      </div>
    </div>
  );
}
