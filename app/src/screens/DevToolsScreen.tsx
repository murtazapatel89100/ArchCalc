import { Base64 } from "js-base64";
import { sha256 } from "js-sha256";
import {
  ArrowLeft,
  Binary,
  Braces,
  Check,
  Clock,
  Copy,
  FileCode,
  Fingerprint,
  HardDrive,
  Hash,
  Terminal,
} from "lucide-solid";
import { createEffect, createSignal, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { v4 as uuidv4 } from "uuid";
import { cn } from "../utils/cn";

const subtleHash = (algo: string, text: string): Promise<string> =>
  crypto.subtle.digest(algo, new TextEncoder().encode(text)).then((buf) =>
    Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join(""),
  );

const tools = [
  {
    id: "hash",
    name: "Hash Generator",
    desc: "MD5, SHA-1, SHA-256, SHA-512",
    icon: Hash,
  },
  {
    id: "uuid",
    name: "UUID Generator",
    desc: "Generate v4 UUIDs",
    icon: Fingerprint,
  },
  {
    id: "timestamp",
    name: "Timestamp Converter",
    desc: "Unix epoch to human readable",
    icon: Clock,
  },
  {
    id: "base64",
    name: "Base64 Encoder",
    desc: "Encode/decode strings",
    icon: FileCode,
  },
  {
    id: "json",
    name: "JSON Formatter",
    desc: "Prettify, validate",
    icon: Braces,
  },
  {
    id: "binary",
    name: "Binary Converter",
    desc: "Text to binary & vice-versa",
    icon: Binary,
  },
  {
    id: "hex",
    name: "Hex Converter",
    desc: "Text to hexadecimal",
    icon: Terminal,
  },
  {
    id: "storage",
    name: "Storage Converter",
    desc: "Bytes to KB/MB/GB/TB",
    icon: HardDrive,
  },
];

export function DevToolsScreen() {
  const [activeToolId, setActiveToolId] = createSignal<string | null>(null);

  const activeTool = () => tools.find((t) => t.id === activeToolId());

  return (
    <div class="flex flex-col h-full max-w-6xl mx-auto w-full p-6 space-y-6 overflow-y-auto">
      <Show
        when={activeTool()}
        fallback={
          <>
            <div class="flex items-center justify-between mb-4">
              <div>
                <h1 class="text-2xl font-semibold tracking-tight">
                  Developer Tools
                </h1>
                <p class="text-[var(--color-app-text-secondary)] text-sm mt-1">
                  Quick access to essential developer utilities.
                </p>
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              <For each={tools}>
                {(tool) => (
                  <ToolCard
                    name={tool.name}
                    desc={tool.desc}
                    icon={tool.icon}
                    onClick={() => setActiveToolId(tool.id)}
                  />
                )}
              </For>
            </div>
          </>
        }
      >
        {(tool) => (
          <div class="flex flex-col h-full">
            <div class="flex items-center gap-4 mb-6 pb-4 border-b border-[var(--color-app-border)]">
              <button
                onClick={() => setActiveToolId(null)}
                class="p-2 rounded-lg bg-[var(--color-app-surface-secondary)] hover:bg-[var(--color-app-border)] text-[var(--color-app-text-primary)] transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded bg-[var(--color-app-accent)]/20 text-[var(--color-app-accent)] flex items-center justify-center">
                  <Dynamic component={tool().icon} size={16} />
                </div>
                <div>
                  <h1 class="text-xl font-semibold tracking-tight">
                    {tool().name}
                  </h1>
                  <p class="text-xs text-[var(--color-app-text-secondary)]">
                    {tool().desc}
                  </p>
                </div>
              </div>
            </div>
            <div class="flex-1 overflow-y-auto">
              <ToolInterface toolId={tool().id} />
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}

function ToolCard(props: {
  name: string;
  desc: string;
  icon: any;
  onClick: () => void;
}) {
  return (
    <div
      onClick={props.onClick}
      class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 flex flex-col items-start gap-4 hover:border-[var(--color-app-accent)]/50 hover:shadow-md transition-all group cursor-pointer relative overflow-hidden"
    >
      <div class="absolute inset-0 bg-gradient-to-br from-[var(--color-app-accent)]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      <div class="relative w-10 h-10 rounded-lg bg-[var(--color-app-surface-secondary)] flex items-center justify-center text-[var(--color-app-text-secondary)] group-hover:bg-[var(--color-app-accent)]/20 group-hover:text-[var(--color-app-accent)] transition-colors">
        <Dynamic component={props.icon} size={20} />
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

function ToolInterface(props: { toolId: string }) {
  const [input, setInput] = createSignal("");
  const [output, setOutput] = createSignal("");
  const [copied, setCopied] = createSignal(false);

  const initialMode = () => {
    if (props.toolId === "hash") return "sha256";
    if (props.toolId === "timestamp") return "epoch_to_date";
    return "encode";
  };

  const [mode, setMode] = createSignal<
    | "encode"
    | "decode"
    | "sha256"
    | "sha1"
    | "sha512"
    | "epoch_to_date"
    | "date_to_epoch"
  >(initialMode() as any);

  createEffect(() => {
    const currentToolId = props.toolId;
    const currentInput = input();
    const currentMode = mode();

    if (currentToolId === "hash") {
      if (!currentInput) {
        setOutput("");
        return;
      }
      if (currentMode === "sha256") {
        setOutput(sha256(currentInput));
      } else {
        const algoName = currentMode === "sha1" ? "SHA-1" : "SHA-512";
        subtleHash(algoName, currentInput).then(setOutput);
      }
    } else if (currentToolId === "uuid") {
      if (!output()) setOutput(uuidv4());
    } else if (currentToolId === "base64") {
      if (!currentInput) {
        setOutput("");
        return;
      }
      if (currentMode === "encode") {
        setOutput(Base64.encode(currentInput));
      } else {
        try {
          setOutput(Base64.decode(currentInput));
        } catch {
          setOutput("Invalid Base64");
        }
      }
    } else if (currentToolId === "timestamp") {
      if (currentMode === "epoch_to_date") {
        if (!currentInput) {
          setOutput(Date.now().toString());
        } else {
          const num = parseInt(currentInput, 10);
          if (!Number.isNaN(num)) {
            const ms = currentInput.length < 13 ? num * 1000 : num;
            setOutput(new Date(ms).toISOString());
          } else {
            setOutput("Invalid timestamp");
          }
        }
      } else {
        if (!currentInput) {
          setOutput("");
          return;
        }
        const d = new Date(currentInput);
        if (!Number.isNaN(d.getTime())) {
          setOutput(d.getTime().toString());
        } else {
          setOutput("Invalid date");
        }
      }
    } else if (currentToolId === "json") {
      if (!currentInput) {
        setOutput("");
        return;
      }
      try {
        const obj = JSON.parse(currentInput);
        setOutput(JSON.stringify(obj, null, 2));
      } catch (e) {
        setOutput(`⚠ ${(e as Error).message}`);
      }
    } else if (currentToolId === "binary") {
      if (!currentInput) {
        setOutput("");
        return;
      }
      try {
        if (currentMode === "encode") {
          setOutput(
            currentInput
              .split("")
              .map((char) => char.charCodeAt(0).toString(2).padStart(8, "0"))
              .join(" "),
          );
        } else {
          setOutput(
            currentInput
              .split(" ")
              .map((bin) => String.fromCharCode(parseInt(bin, 2)))
              .join(""),
          );
        }
      } catch {
        setOutput("Invalid input");
      }
    } else if (currentToolId === "hex") {
      if (!currentInput) {
        setOutput("");
        return;
      }
      try {
        if (currentMode === "encode") {
          setOutput(
            currentInput
              .split("")
              .map((char) => char.charCodeAt(0).toString(16).padStart(2, "0"))
              .join(" "),
          );
        } else {
          setOutput(
            currentInput
              .split(" ")
              .map((hex) => String.fromCharCode(parseInt(hex, 16)))
              .join(""),
          );
        }
      } catch {
        setOutput("Invalid input");
      }
    } else if (currentToolId === "storage") {
      if (!currentInput) {
        setOutput("");
        return;
      }
      const bytes = parseInt(currentInput, 10);
      if (!Number.isNaN(bytes)) {
        setOutput(
          `KB: ${(bytes / 1024).toFixed(2)}\nMB: ${(bytes / 1024 ** 2).toFixed(2)}\nGB: ${(bytes / 1024 ** 3).toFixed(2)}\nTB: ${(bytes / 1024 ** 4).toFixed(2)}`,
        );
      }
    }
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(output());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const regenerateUuid = () => setOutput(uuidv4());

  const timestampModes = [
    { id: "epoch_to_date", label: "Epoch → Date" },
    { id: "date_to_epoch", label: "Date → Epoch" },
  ];

  return (
    <div class="flex flex-col gap-6 max-w-3xl">
      {/* Tool specific controls */}
      <Show when={props.toolId === "hash"}>
        <div class="flex gap-2">
          <For each={["sha256", "sha1", "sha512"]}>
            {(m) => (
              <button
                onClick={() => setMode(m as any)}
                class={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  mode() === m
                    ? "bg-[var(--color-app-accent)] text-white"
                    : "bg-[var(--color-app-surface-secondary)] text-[var(--color-app-text-secondary)] hover:text-white",
                )}
              >
                {m.toUpperCase()}
              </button>
            )}
          </For>
        </div>
      </Show>

      <Show
        when={
          props.toolId === "base64" ||
          props.toolId === "binary" ||
          props.toolId === "hex"
        }
      >
        <div class="flex gap-2">
          <For each={["encode", "decode"]}>
            {(m) => (
              <button
                onClick={() => setMode(m as any)}
                class={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize",
                  mode() === m
                    ? "bg-[var(--color-app-accent)] text-white"
                    : "bg-[var(--color-app-surface-secondary)] text-[var(--color-app-text-secondary)] hover:text-white",
                )}
              >
                {m}
              </button>
            )}
          </For>
        </div>
      </Show>

      <Show when={props.toolId === "timestamp"}>
        <div class="flex gap-2">
          <For each={timestampModes}>
            {(m) => (
              <button
                onClick={() => {
                  setMode(m.id as any);
                  setInput("");
                  setOutput("");
                }}
                class={cn(
                  "px-4 py-1.5 rounded-lg text-sm font-medium transition-colors",
                  mode() === m.id
                    ? "bg-[var(--color-app-accent)] text-white"
                    : "bg-[var(--color-app-surface-secondary)] text-[var(--color-app-text-secondary)] hover:text-white",
                )}
              >
                {m.label}
              </button>
            )}
          </For>
        </div>
      </Show>

      {/* Input */}
      <Show when={props.toolId !== "uuid"}>
        <div class="space-y-2">
          <label class="text-sm font-medium text-[var(--color-app-text-secondary)]">
            Input
          </label>
          <Show
            when={props.toolId === "json"}
            fallback={
              <input
                type="text"
                value={input()}
                onInput={(e) => setInput(e.currentTarget.value)}
                class="w-full bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl px-4 py-3 text-sm font-mono focus:outline-none focus:border-[var(--color-app-accent)]/50 text-[var(--color-app-text-primary)]"
                placeholder={
                  props.toolId === "timestamp"
                    ? mode() === "epoch_to_date"
                      ? "Enter epoch (ms or s) or leave blank for now..."
                      : "Enter date (e.g. 2024-01-15T10:00:00)..."
                    : props.toolId === "storage"
                      ? "Enter bytes..."
                      : "Type here..."
                }
              />
            }
          >
            <textarea
              value={input()}
              onInput={(e) => setInput(e.currentTarget.value)}
              class="w-full h-40 bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-4 text-sm font-mono focus:outline-none focus:border-[var(--color-app-accent)]/50 text-[var(--color-app-text-primary)]"
              placeholder="Paste JSON here..."
            />
          </Show>
        </div>
      </Show>

      {/* Output */}
      <div class="space-y-2">
        <div class="flex items-center justify-between">
          <label class="text-sm font-medium text-[var(--color-app-text-secondary)]">
            Output
          </label>
          <div class="flex gap-2">
            <Show when={props.toolId === "uuid"}>
              <button
                onClick={regenerateUuid}
                class="text-xs bg-[var(--color-app-surface-secondary)] hover:bg-[var(--color-app-border)] px-2 py-1 rounded text-[var(--color-app-text-primary)] transition-colors"
              >
                Regenerate
              </button>
            </Show>
            <button
              onClick={handleCopy}
              class="text-xs bg-[var(--color-app-surface-secondary)] hover:bg-[var(--color-app-border)] px-2 py-1 rounded text-[var(--color-app-text-primary)] transition-colors flex items-center gap-1"
            >
              <Show
                when={copied()}
                fallback={
                  <>
                    <Copy size={12} /> <span>Copy</span>
                  </>
                }
              >
                <Check size={12} class="text-[var(--color-app-success)]" />{" "}
                <span>Copied</span>
              </Show>
            </button>
          </div>
        </div>
        <div class="w-full min-h-[3rem] bg-[var(--color-app-surface-secondary)]/50 border border-[var(--color-app-border)] rounded-xl p-4 text-sm font-mono break-all text-[var(--color-app-text-primary)] whitespace-pre-wrap">
          {output() || "..."}
        </div>
      </div>
    </div>
  );
}
