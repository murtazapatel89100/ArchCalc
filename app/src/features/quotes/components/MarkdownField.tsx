import { createSignal, Show } from "solid-js";
import { inputClass } from "../../../components/ui";
import { cn } from "../../../utils/cn";
import { markdownToHtml } from "../export/markdown-render";

/** Textarea with a Write / Preview toggle for markdown that ends up in the exported quote. */
export function MarkdownField(props: {
  value: string;
  onInput: (value: string) => void;
  placeholder?: string;
  rows?: number;
  "aria-label"?: string;
}) {
  const [preview, setPreview] = createSignal(false);

  const tab = (active: boolean) =>
    cn(
      "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
      active
        ? "bg-[var(--color-app-surface-secondary)] text-[var(--color-app-text-primary)]"
        : "text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-text-primary)]",
    );

  return (
    <div class="flex flex-col gap-1.5">
      <div class="flex items-center justify-between gap-2">
        <div class="flex gap-1">
          <button class={tab(!preview())} onClick={() => setPreview(false)}>
            Write
          </button>
          <button class={tab(preview())} onClick={() => setPreview(true)}>
            Preview
          </button>
        </div>
        <span class="text-[11px] text-[var(--color-app-text-secondary)]/70 font-mono">
          **bold** _italic_ - list | table | [link](url)
        </span>
      </div>
      <Show
        when={preview()}
        fallback={
          <textarea
            value={props.value}
            rows={props.rows ?? 4}
            placeholder={props.placeholder}
            aria-label={props["aria-label"]}
            spellcheck={true}
            class={cn(inputClass, "w-full resize-y font-mono text-[13px]")}
            onInput={(e) => props.onInput(e.currentTarget.value)}
          />
        }
      >
        <Show
          when={props.value.trim()}
          fallback={
            <p class="text-xs text-[var(--color-app-text-secondary)] py-3 text-center border border-dashed border-[var(--color-app-border)] rounded-lg">
              Nothing to preview yet.
            </p>
          }
        >
          {/* Raw HTML is escaped by markdownToHtml, so user text can't inject markup. */}
          <div
            class="md-preview rounded-lg border border-[var(--color-app-border)] bg-[var(--color-app-surface-secondary)]/40 px-4 py-3"
            innerHTML={markdownToHtml(props.value)}
          />
        </Show>
      </Show>
    </div>
  );
}
