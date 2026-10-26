import { Trash2 } from "lucide-solid";

export function EmptyRows(props: { text: string }) {
  return (
    <p class="text-xs text-[var(--color-app-text-secondary)] py-3 text-center border border-dashed border-[var(--color-app-border)] rounded-lg">
      {props.text}
    </p>
  );
}

export function RemoveButton(props: { onClick: () => void }) {
  return (
    <button
      onClick={props.onClick}
      aria-label="Remove row"
      class="h-9 w-8 flex items-center justify-center rounded-lg text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-error)] hover:bg-[var(--color-app-error)]/10 transition-colors"
    >
      <Trash2 size={15} />
    </button>
  );
}
