import { Database, Info, Keyboard, Settings2 } from "lucide-solid";
import { createSignal, For, type JSX, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { cn } from "../utils/cn";
import { createLocalStorage } from "../utils/createLocalStorage";

const categories = [
  { id: "general", name: "General", icon: Settings2 },
  { id: "keyboard", name: "Keyboard Shortcuts", icon: Keyboard },
  { id: "data", name: "Data", icon: Database },
  { id: "about", name: "About", icon: Info },
];

export function SettingsScreen() {
  const [activeTab, setActiveTab] = createSignal("general");
  const [retentionDays, setRetentionDays] = createLocalStorage<number>(
    "archcalc_history_retention",
    30,
  );
  const [workspaceTitle, setWorkspaceTitle] = createLocalStorage(
    "archcalc_workspace_title",
    "Dev Workspace",
  );
  const [workspaceSubtitle, setWorkspaceSubtitle] = createLocalStorage(
    "archcalc_workspace_subtitle",
    "Local Environment",
  );
  const [workspaceImage, setWorkspaceImage] = createLocalStorage(
    "archcalc_workspace_image",
    "",
  );
  const [exported, setExported] = createSignal(false);

  const handleExport = () => {
    try {
      const data = {
        archcalc_history: localStorage.getItem("archcalc_history"),
        archcalc_history_retention: localStorage.getItem(
          "archcalc_history_retention",
        ),
        archcalc_workspace_title: localStorage.getItem(
          "archcalc_workspace_title",
        ),
        archcalc_workspace_subtitle: localStorage.getItem(
          "archcalc_workspace_subtitle",
        ),
        archcalc_workspace_image: localStorage.getItem(
          "archcalc_workspace_image",
        ),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `archcalc-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setExported(true);
      setTimeout(() => setExported(false), 2000);
    } catch (error) {
      console.error("Failed to export data:", error);
      alert("Failed to export data.");
    }
  };

  const handleImport = (e: Event) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (typeof data !== "object" || !data)
          throw new Error("Invalid format");

        Object.keys(data).forEach((key) => {
          if (data[key] !== null && data[key] !== undefined) {
            localStorage.setItem(key, data[key]);
          }
        });
        window.dispatchEvent(new Event("local-storage"));
        alert("Data imported successfully!");
      } catch (error) {
        console.error("Failed to import data:", error);
        alert(
          "Failed to import data. Make sure the file is a valid ArchCalc export.",
        );
      }
    };
    reader.readAsText(file);
    (e.target as HTMLInputElement).value = "";
  };

  const handleClear = () => {
    if (
      confirm("Are you sure you want to clear all data? This cannot be undone.")
    ) {
      const keys = [
        "archcalc_history",
        "archcalc_history_retention",
        "archcalc_workspace_title",
        "archcalc_workspace_subtitle",
        "archcalc_workspace_image",
      ];
      keys.forEach((key) => {
        localStorage.removeItem(key);
      });
      window.dispatchEvent(new Event("local-storage"));
      alert("All data has been cleared.");
      window.location.reload();
    }
  };

  return (
    <div class="flex h-full max-w-5xl mx-auto w-full">
      {/* Settings Sidebar */}
      <div class="w-64 border-r border-[var(--color-app-border)] py-6 pr-6 space-y-1 pl-6">
        <h2 class="text-xl font-semibold mb-6 px-3">Settings</h2>
        <For each={categories}>
          {(cat) => (
            <button
              onClick={() => setActiveTab(cat.id)}
              class={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                activeTab() === cat.id
                  ? "bg-[var(--color-app-accent)] text-white shadow-sm"
                  : "text-[var(--color-app-text-secondary)] hover:bg-[var(--color-app-surface-secondary)] hover:text-[var(--color-app-text-primary)]",
              )}
            >
              <Dynamic component={cat.icon} size={16} />
              {cat.name}
            </button>
          )}
        </For>
      </div>

      {/* Settings Content */}
      <div class="flex-1 p-8 overflow-y-auto">
        <div class="max-w-2xl space-y-8">
          <Show when={activeTab() === "general"}>
            <div class="space-y-6">
              <div>
                <h3 class="text-lg font-medium">General</h3>
                <p class="text-sm text-[var(--color-app-text-secondary)] mt-1">
                  Basic application behavior.
                </p>
              </div>
              <div class="h-px bg-[var(--color-app-border)]"></div>

              <div class="space-y-4">
                <SettingsRow
                  title="Global shortcut"
                  description="Shortcut to show/hide the main command palette."
                  control={
                    <div class="flex gap-1">
                      <Kbd>Ctrl</Kbd>
                      <Kbd>Space</Kbd>
                    </div>
                  }
                />
                <SettingsRow
                  title="History retention"
                  description="How long to keep your calculation history."
                  control={
                    <select
                      value={retentionDays()}
                      onChange={(e) =>
                        setRetentionDays(Number(e.currentTarget.value))
                      }
                      class="bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] rounded-lg px-3 py-1.5 text-sm outline-none text-[var(--color-app-text-primary)]"
                    >
                      <option
                        class="bg-[var(--color-app-surface)] text-[var(--color-app-text-primary)]"
                        value={7}
                      >
                        7 days
                      </option>
                      <option
                        class="bg-[var(--color-app-surface)] text-[var(--color-app-text-primary)]"
                        value={30}
                      >
                        30 days
                      </option>
                      <option
                        class="bg-[var(--color-app-surface)] text-[var(--color-app-text-primary)]"
                        value={90}
                      >
                        90 days
                      </option>
                      <option
                        class="bg-[var(--color-app-surface)] text-[var(--color-app-text-primary)]"
                        value={0}
                      >
                        Forever
                      </option>
                    </select>
                  }
                />
              </div>

              <div class="space-y-6 mt-10">
                <div>
                  <h3 class="text-lg font-medium">Workspace Profile</h3>
                  <p class="text-sm text-[var(--color-app-text-secondary)] mt-1">
                    Customize your workspace appearance in the sidebar.
                  </p>
                </div>
                <div class="h-px bg-[var(--color-app-border)]"></div>

                <div class="space-y-4">
                  <SettingsRow
                    title="Workspace Title"
                    description="The main name of your workspace."
                    control={
                      <input
                        type="text"
                        value={workspaceTitle()}
                        onInput={(e) =>
                          setWorkspaceTitle(e.currentTarget.value)
                        }
                        class="bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] rounded-lg px-3 py-1.5 text-sm outline-none text-[var(--color-app-text-primary)] w-48"
                      />
                    }
                  />
                  <SettingsRow
                    title="Workspace Subtitle"
                    description="A short description or environment name."
                    control={
                      <input
                        type="text"
                        value={workspaceSubtitle()}
                        onInput={(e) =>
                          setWorkspaceSubtitle(e.currentTarget.value)
                        }
                        class="bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] rounded-lg px-3 py-1.5 text-sm outline-none text-[var(--color-app-text-primary)] w-48"
                      />
                    }
                  />
                  <SettingsRow
                    title="Workspace Image"
                    description="Upload a local file for the workspace logo."
                    control={
                      <div class="flex items-center gap-2">
                        {workspaceImage() && (
                          <button
                            onClick={() => setWorkspaceImage("")}
                            class="px-2 py-1.5 text-xs text-[var(--color-app-error)] hover:bg-[var(--color-app-error)]/10 rounded transition-colors"
                          >
                            Clear
                          </button>
                        )}
                        <label class="cursor-pointer bg-[var(--color-app-surface-secondary)] hover:bg-[var(--color-app-surface)] border border-[var(--color-app-border)] text-[var(--color-app-text-primary)] rounded-lg px-3 py-1.5 text-sm transition-colors">
                          Choose File
                          <input
                            type="file"
                            accept="image/*"
                            class="hidden"
                            onChange={(e) => {
                              const file = e.currentTarget.files?.[0];
                              if (file) {
                                const reader = new FileReader();
                                reader.onload = (e) =>
                                  setWorkspaceImage(e.target?.result as string);
                                reader.readAsDataURL(file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    }
                  />
                </div>
              </div>
            </div>
          </Show>

          <Show when={activeTab() === "keyboard"}>
            <div class="space-y-6">
              <div>
                <h3 class="text-lg font-medium">Keyboard Shortcuts</h3>
                <p class="text-sm text-[var(--color-app-text-secondary)] mt-1">
                  Navigate and control ArchCalc quickly.
                </p>
              </div>
              <div class="h-px bg-[var(--color-app-border)]"></div>

              <div class="space-y-4">
                <SettingsRow
                  title="Focus search/input"
                  description="Quickly jump to the main input box."
                  control={<Kbd>/</Kbd>}
                />
                <SettingsRow
                  title="Evaluate calculation"
                  description="Calculate the current expression."
                  control={<Kbd>Enter</Kbd>}
                />
                <SettingsRow
                  title="Navigate history (older)"
                  description="Go back to previous calculations."
                  control={<Kbd>↑</Kbd>}
                />
                <SettingsRow
                  title="Navigate history (newer)"
                  description="Go forward in your calculations."
                  control={<Kbd>↓</Kbd>}
                />
                <SettingsRow
                  title="Clear input"
                  description="Clear the current expression."
                  control={<Kbd>Esc</Kbd>}
                />
              </div>
            </div>
          </Show>

          <Show when={activeTab() === "data"}>
            <div class="space-y-6">
              <div>
                <h3 class="text-lg font-medium">Data</h3>
                <p class="text-sm text-[var(--color-app-text-secondary)] mt-1">
                  Manage your settings and history.
                </p>
              </div>
              <div class="h-px bg-[var(--color-app-border)]"></div>

              <div class="space-y-4">
                <SettingsRow
                  title="Export Data"
                  description="Save your history, workspaces, and settings to a JSON file."
                  control={
                    <button
                      onClick={handleExport}
                      class={cn(
                        "px-3 py-1.5 border text-sm font-medium rounded-lg transition-colors",
                        exported()
                          ? "bg-[var(--color-app-success)]/10 border-[var(--color-app-success)]/30 text-[var(--color-app-success)]"
                          : "bg-[var(--color-app-surface-secondary)] hover:bg-[var(--color-app-surface)] border-[var(--color-app-border)] text-[var(--color-app-text-primary)]",
                      )}
                    >
                      {exported() ? "Exported!" : "Export..."}
                    </button>
                  }
                />
                <SettingsRow
                  title="Import Data"
                  description="Restore data from a previously exported JSON file."
                  control={
                    <label class="cursor-pointer px-3 py-1.5 bg-[var(--color-app-surface-secondary)] hover:bg-[var(--color-app-surface)] border border-[var(--color-app-border)] text-[var(--color-app-text-primary)] text-sm font-medium rounded-lg transition-colors">
                      Import...
                      <input
                        type="file"
                        accept=".json"
                        class="hidden"
                        onChange={handleImport}
                      />
                    </label>
                  }
                />
                <SettingsRow
                  title="Clear Data"
                  description="Permanently delete all local data. This cannot be undone."
                  control={
                    <button
                      onClick={handleClear}
                      class="px-3 py-1.5 bg-[var(--color-app-error)]/10 text-[var(--color-app-error)] hover:bg-[var(--color-app-error)]/20 border border-[var(--color-app-error)]/20 text-sm font-medium rounded-lg transition-colors"
                    >
                      Clear All
                    </button>
                  }
                />
              </div>
            </div>
          </Show>

          <Show when={activeTab() === "about"}>
            <div class="space-y-6">
              <div>
                <h3 class="text-lg font-medium">About ArchCalc</h3>
                <p class="text-sm text-[var(--color-app-text-secondary)] mt-1">
                  Version 1.0.0 (Beta)
                </p>
              </div>
              <div class="h-px bg-[var(--color-app-border)]"></div>
              <p class="text-sm text-[var(--color-app-text-secondary)] leading-relaxed">
                ArchCalc is a keyboard-first utility designed for developers and
                power users. It seamlessly combines a traditional calculator,
                natural language processing, developer tools, unit conversion,
                and a live-evaluating scratchpad into one lightning-fast
                application.
              </p>
            </div>
          </Show>
        </div>
      </div>
    </div>
  );
}

function SettingsRow(props: {
  title: string;
  description: string;
  control: JSX.Element;
}) {
  return (
    <div class="flex items-center justify-between py-2">
      <div class="flex flex-col gap-1 pr-8">
        <span class="font-medium text-[var(--color-app-text-primary)]">
          {props.title}
        </span>
        <span class="text-sm text-[var(--color-app-text-secondary)]">
          {props.description}
        </span>
      </div>
      <div class="flex-shrink-0">{props.control}</div>
    </div>
  );
}

function Toggle(props: { defaultChecked?: boolean }) {
  const [checked, setChecked] = createSignal(props.defaultChecked);
  return (
    <button
      onClick={() => setChecked(!checked())}
      class={cn(
        "w-10 h-6 rounded-full transition-colors relative flex items-center px-1 border border-transparent",
        checked()
          ? "bg-[var(--color-app-accent)]"
          : "bg-[var(--color-app-surface-secondary)] border-[var(--color-app-border)]",
      )}
    >
      <div
        class={cn(
          "w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200",
          checked() ? "translate-x-4" : "translate-x-0",
        )}
      />
    </button>
  );
}

function Kbd(props: { children: JSX.Element }) {
  return (
    <kbd class="h-6 inline-flex items-center gap-1 rounded border border-[var(--color-app-border)] bg-[var(--color-app-surface-secondary)] px-2 font-mono text-xs font-medium text-[var(--color-app-text-secondary)]">
      {props.children}
    </kbd>
  );
}
