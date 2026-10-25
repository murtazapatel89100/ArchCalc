import {
  Field,
  inputClass,
  Modal,
  NumberInput,
  Select,
} from "../../../components/ui";
import { getTemplate, templates } from "../export/templates";
import { currencies } from "../format";
import { useQuoteSettings } from "../store";

export function QuoteSettingsModal(props: {
  open: boolean;
  onClose: () => void;
}) {
  const [settings, update] = useQuoteSettings();

  return (
    <Modal open={props.open} onClose={props.onClose} title="Quote settings">
      <div class="flex flex-col gap-4">
        <Field
          label="Business name"
          hint="Shown in the header of exported quotes."
        >
          <input
            value={settings().businessName}
            placeholder="e.g. Maniac Prints"
            class={inputClass}
            onInput={(e) => update({ businessName: e.currentTarget.value })}
          />
        </Field>
        <Field label="Contact line" hint="Phone, email, address or GSTIN.">
          <input
            value={settings().contact}
            placeholder="+91 98xxxxxx · hello@example.com"
            class={inputClass}
            onInput={(e) => update({ contact: e.currentTarget.value })}
          />
        </Field>
        <Field label="Currency">
          <Select
            value={settings().currency}
            options={currencies.map((c) => ({ value: c.code, label: c.label }))}
            onChange={(currency) => update({ currency })}
          />
        </Field>
        <Field label="Default export template">
          <Select
            value={getTemplate(settings().templateId).id}
            options={templates.map((t) => ({ value: t.id, label: t.name }))}
            onChange={(templateId) => update({ templateId })}
          />
        </Field>
        <Field label="Default tax / GST for new quotes">
          <NumberInput
            value={settings().defaultTaxPercent}
            suffix="%"
            onChange={(defaultTaxPercent) => update({ defaultTaxPercent })}
          />
        </Field>
      </div>
    </Modal>
  );
}
