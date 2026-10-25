import { createSignal, For, type JSX, Show, splitProps } from "solid-js";
import { cn } from "../../utils/cn";

export const inputClass =
  "bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-app-text-primary)] placeholder:text-[var(--color-app-text-secondary)]/60 focus:outline-none focus:border-[var(--color-app-accent)] transition-colors";

export function Card(props: {
  title?: string;
  description?: string;
  actions?: JSX.Element;
  class?: string;
  children: JSX.Element;
}) {
  return (
    <section
      class={cn(
        "bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5",
        props.class,
      )}
    >
      <Show when={props.title || props.actions}>
        <div class="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 class="text-sm font-semibold">{props.title}</h3>
            <Show when={props.description}>
              <p class="text-xs text-[var(--color-app-text-secondary)] mt-0.5">
                {props.description}
              </p>
            </Show>
          </div>
          {props.actions}
        </div>
      </Show>
      {props.children}
    </section>
  );
}

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export function Button(
  props: JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    size?: "sm" | "md";
  },
) {
  const [local, rest] = splitProps(props, ["variant", "size", "class"]);
  return (
    <button
      type="button"
      {...rest}
      class={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:pointer-events-none",
        local.size === "sm" ? "px-2.5 py-1.5 text-xs" : "px-4 py-2 text-sm",
        {
          primary:
            "bg-[var(--color-app-accent)] text-white hover:bg-[var(--color-app-accent)]/90",
          secondary:
            "bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] text-[var(--color-app-text-primary)] hover:bg-[var(--color-app-border)]",
          ghost:
            "text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-text-primary)] hover:bg-[var(--color-app-surface-secondary)]",
          danger:
            "text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-error)] hover:bg-[var(--color-app-error)]/10",
        }[local.variant ?? "secondary"],
        local.class,
      )}
    />
  );
}

export function Field(props: {
  label: string;
  hint?: string;
  class?: string;
  children: JSX.Element;
}) {
  return (
    <label class={cn("flex flex-col gap-1.5 min-w-0", props.class)}>
      <span class="text-xs font-medium text-[var(--color-app-text-secondary)]">
        {props.label}
      </span>
      {props.children}
      <Show when={props.hint}>
        <span class="text-[11px] text-[var(--color-app-text-secondary)]/70">
          {props.hint}
        </span>
      </Show>
    </label>
  );
}

/**
 * Numeric input that keeps the raw text while focused, so partial values like "1." or ""
 * can be typed without the field snapping back to the parsed number.
 */
export function NumberInput(props: {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  class?: string;
  placeholder?: string;
  "aria-label"?: string;
}) {
  const [draft, setDraft] = createSignal<string | null>(null);
  const display = () =>
    draft() ?? (Number.isFinite(props.value) ? String(props.value) : "");

  return (
    <div
      class={cn(
        inputClass,
        "flex items-center gap-1.5 focus-within:border-[var(--color-app-accent)] px-2.5",
        props.class,
      )}
    >
      <Show when={props.prefix}>
        <span class="text-xs text-[var(--color-app-text-secondary)] shrink-0">
          {props.prefix}
        </span>
      </Show>
      <input
        type="text"
        inputmode="decimal"
        aria-label={props["aria-label"]}
        placeholder={props.placeholder ?? "0"}
        value={display()}
        onFocus={() => setDraft(display())}
        onBlur={() => setDraft(null)}
        onInput={(e) => {
          const text = e.currentTarget.value.replace(/[^0-9.-]/g, "");
          e.currentTarget.value = text;
          setDraft(text);
          const n = Number.parseFloat(text);
          props.onChange(Number.isFinite(n) ? n : 0);
        }}
        class="bg-transparent outline-none w-full min-w-0 font-mono"
      />
      <Show when={props.suffix}>
        <span class="text-xs text-[var(--color-app-text-secondary)] shrink-0">
          {props.suffix}
        </span>
      </Show>
    </div>
  );
}

export function Select<T extends string>(props: {
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  class?: string;
  "aria-label"?: string;
}) {
  return (
    <select
      value={props.value}
      aria-label={props["aria-label"]}
      onChange={(e) => props.onChange(e.currentTarget.value as T)}
      class={cn(inputClass, "cursor-pointer", props.class)}
    >
      <For each={props.options}>
        {(o) => (
          <option
            class="bg-[var(--color-app-surface)] text-[var(--color-app-text-primary)]"
            value={o.value}
          >
            {o.label}
          </option>
        )}
      </For>
    </select>
  );
}

export function Modal(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  class?: string;
  children: JSX.Element;
}) {
  return (
    <Show when={props.open}>
      <div
        class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={(e) => e.target === e.currentTarget && props.onClose()}
      >
        <div
          class={cn(
            "bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl shadow-2xl w-full max-w-md max-h-full flex flex-col",
            props.class,
          )}
        >
          <div class="flex items-center justify-between px-5 py-4 border-b border-[var(--color-app-border)]">
            <h2 class="text-base font-semibold">{props.title}</h2>
            <button
              onClick={props.onClose}
              aria-label="Close"
              class="text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-text-primary)] text-lg leading-none"
            >
              ×
            </button>
          </div>
          <div class="p-5 overflow-y-auto">{props.children}</div>
        </div>
      </div>
    </Show>
  );
}
