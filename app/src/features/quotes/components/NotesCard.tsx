import { Plus } from "lucide-solid";
import { For } from "solid-js";
import { Button, Card, inputClass } from "../../../components/ui";
import { cn } from "../../../utils/cn";
import { quoteActions } from "../store";
import type { NoteSection } from "../types";
import { MarkdownField } from "./MarkdownField";
import { RemoveButton } from "./RowControls";

/** Starting points for extra note sections; users edit them freely after adding. */
const sectionPresets = [
  {
    label: "Terms",
    title: "Terms & conditions",
    body: "- Prices are valid for **15 days** from the quote date.\n- **50% advance** to start; balance before delivery.\n- Colours may vary slightly between material batches.",
  },
  {
    label: "Payment",
    title: "Payment details",
    body: "**UPI:** yourname@upi  \n**Bank transfer:** Account name · A/C 0000000000 · IFSC XXXX0000000",
  },
  {
    label: "Delivery",
    title: "Delivery",
    body: "- Ready in **3–5 working days** after the advance payment.\n- Local pickup is free; shipping is charged at actuals.",
  },
  { label: "Custom", title: "", body: "" },
];

/** What notes belong to: a quote or a client order. */
interface NotesTarget {
  notes: string;
  sections?: NoteSection[];
}

/** Markdown notes plus extra titled sections (terms, payment…), shown on the export. */
export function NotesCard(props: {
  notes: string;
  sections: NoteSection[] | undefined;
  description?: string;
  update: (fn: (target: NotesTarget) => void) => void;
}) {
  const update = (fn: (target: NotesTarget) => void) => props.update(fn);
  return (
    <Card
      title="Notes & terms"
      description={
        props.description ??
        "Markdown, rendered on the exported quote. Add sections for terms, payment or delivery details."
      }
    >
      <div class="flex flex-col gap-4">
        {/* Not a <label>/Field: clicks inside a label re-target its first button (Write). */}
        <div class="flex flex-col gap-1.5">
          <span class="text-xs font-medium text-[var(--color-app-text-secondary)]">
            Notes
          </span>
          <MarkdownField
            aria-label="Notes"
            value={props.notes}
            placeholder={
              "e.g. Includes **2 colour options**.\n- Matte finish\n- Gift box on request"
            }
            onInput={(v) =>
              update((q) => {
                q.notes = v;
              })
            }
          />
        </div>

        <For each={props.sections ?? []}>
          {(sec, i) => (
            <div class="rounded-lg border border-[var(--color-app-border)] p-3 flex flex-col gap-2.5">
              <div class="flex items-center gap-2">
                <input
                  value={sec.title}
                  placeholder="Section title, e.g. Warranty"
                  aria-label="Section title"
                  class={cn(inputClass, "flex-1 font-medium")}
                  onInput={(e) => {
                    const v = e.currentTarget.value;
                    update((q) => {
                      if (q.sections) q.sections[i()].title = v;
                    });
                  }}
                />
                <RemoveButton
                  onClick={() =>
                    update((q) => {
                      q.sections?.splice(i(), 1);
                    })
                  }
                />
              </div>
              <MarkdownField
                aria-label={`${sec.title || "Section"} content`}
                value={sec.body}
                onInput={(v) =>
                  update((q) => {
                    if (q.sections) q.sections[i()].body = v;
                  })
                }
              />
            </div>
          )}
        </For>

        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-[var(--color-app-text-secondary)]">
            Add section:
          </span>
          <For each={sectionPresets}>
            {(preset) => (
              <Button
                size="sm"
                onClick={() =>
                  update((q) => {
                    q.sections ??= [];
                    q.sections.push({
                      id: quoteActions.newLineId(),
                      title: preset.title,
                      body: preset.body,
                    });
                  })
                }
              >
                <Plus size={14} /> {preset.label}
              </Button>
            )}
          </For>
        </div>
      </div>
    </Card>
  );
}
