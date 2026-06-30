import { A, useLocation, useNavigate } from "@solidjs/router";
import {
  Activity,
  ArrowRightLeft,
  Briefcase,
  Calculator,
  Hash,
  History,
  Menu,
  Settings,
  Wrench,
} from "lucide-solid";
import { createSignal, type JSX, onCleanup, onMount } from "solid-js";
import { cn } from "../utils/cn";
import { createLocalStorage } from "../utils/createLocalStorage";
import { TitleBar } from "./TitleBar";

const navItems = [
  { icon: Calculator, label: "Dashboard", path: "/" },
  { icon: Hash, label: "Calculator", path: "/calculator" },
  { icon: History, label: "History", path: "/history" },
  { icon: Briefcase, label: "Workspaces", path: "/workspaces" },
  { icon: ArrowRightLeft, label: "Converters", path: "/converter" },
  { icon: Wrench, label: "Developer Tools", path: "/devtools" },
  { icon: Activity, label: "System", path: "/system" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function Layout(props: { children?: JSX.Element }) {
  const [isSidebarOpen, setIsSidebarOpen] = createSignal(true);
  const location = useLocation();
  const navigate = useNavigate();
  const [workspaceTitle] = createLocalStorage(
    "archcalc_workspace_title",
    "Dev Workspace",
  );
  const [workspaceSubtitle] = createLocalStorage(
    "archcalc_workspace_subtitle",
    "Local Environment",
  );
  const [workspaceImage] = createLocalStorage("archcalc_workspace_image", "");

  onMount(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      // Ctrl + Space to open command palette / dashboard
      if (e.ctrlKey && e.code === "Space") {
        e.preventDefault();
        navigate("/");
      }
    };
    window.addEventListener("keydown", handleGlobalKey);
    onCleanup(() => window.removeEventListener("keydown", handleGlobalKey));
  });

  return (
    <div class="flex h-screen w-full flex-col bg-[var(--color-app-bg)] text-[var(--color-app-text-primary)] overflow-hidden font-sans selection:bg-[var(--color-app-accent)] selection:text-white">
      <TitleBar />
      <div class="flex flex-1 min-h-0 w-full overflow-hidden">
        {/* Sidebar */}
        <aside
          class={cn(
            "flex flex-col border-r border-[var(--color-app-border)] bg-[var(--color-app-surface)] transition-all duration-300 ease-in-out z-20",
            isSidebarOpen() ? "w-64" : "w-16",
          )}
        >
          <div class="flex h-14 items-center justify-between px-4 border-b border-[var(--color-app-border)]">
            <div
              class={cn(
                "flex items-center gap-2 font-semibold text-lg overflow-hidden whitespace-nowrap",
                !isSidebarOpen() && "opacity-0 w-0",
              )}
            >
              <div class="w-6 h-6 rounded bg-[var(--color-app-accent)] flex items-center justify-center text-xs text-white">
                Λ
              </div>
              ArchCalc
            </div>
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen())}
              class="p-1 rounded hover:bg-[var(--color-app-surface-secondary)] text-[var(--color-app-text-secondary)] transition-colors"
            >
              <Menu size={18} />
            </button>
          </div>

          <nav class="flex-1 py-4 flex flex-col gap-1 px-2 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = () => location.pathname === item.path;
              return (
                <A
                  href={item.path}
                  class={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 group relative",
                    isActive()
                      ? "bg-[var(--color-app-surface-secondary)] text-[var(--color-app-text-primary)]"
                      : "text-[var(--color-app-text-secondary)] hover:bg-[var(--color-app-surface-secondary)]/50 hover:text-[var(--color-app-text-primary)]",
                  )}
                  title={!isSidebarOpen() ? item.label : undefined}
                >
                  {isActive() && (
                    <div class="absolute left-0 w-1 h-4 bg-[var(--color-app-accent)] rounded-r-full" />
                  )}
                  <item.icon
                    size={18}
                    class={cn(
                      "shrink-0",
                      isActive() && "text-[var(--color-app-accent)]",
                    )}
                  />
                  <span
                    class={cn(
                      "whitespace-nowrap transition-opacity",
                      !isSidebarOpen() && "opacity-0 hidden",
                    )}
                  >
                    {item.label}
                  </span>
                </A>
              );
            })}
          </nav>

          {/* User / Workspace indicator at bottom */}
          <div
            class={cn(
              "p-4 border-t border-[var(--color-app-border)] flex items-center gap-3",
              !isSidebarOpen() && "justify-center px-0",
            )}
          >
            {workspaceImage() ? (
              <img
                src={workspaceImage()}
                alt="Workspace Logo"
                class="w-8 h-8 rounded-full object-cover shrink-0"
              />
            ) : (
              <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-[var(--color-app-accent)] to-purple-500 shrink-0" />
            )}
            {isSidebarOpen() && (
              <div class="flex flex-col overflow-hidden">
                <span class="text-sm font-medium truncate">
                  {workspaceTitle()}
                </span>
                <span class="text-xs text-[var(--color-app-text-secondary)] truncate">
                  {workspaceSubtitle()}
                </span>
              </div>
            )}
          </div>
        </aside>

        {/* Main Content */}
        <main class="flex-1 flex flex-col min-w-0 bg-[var(--color-app-bg)] relative">
          {props.children}
        </main>
      </div>
    </div>
  );
}
