import { invoke } from "@tauri-apps/api/core";
import {
  Activity,
  Battery,
  Cpu,
  Database,
  HardDrive,
  Info,
  Wifi,
} from "lucide-solid";
import { SolidApexCharts } from "solid-apexcharts";
import { createSignal, onCleanup, onMount, Show } from "solid-js";

interface SystemInfo {
  cpu_usage: number;
  cpu_cores: number;
  ram_used: number;
  ram_total: number;
  swap_used: number;
  swap_total: number;
  net_rx: number;
  net_tx: number;
  os_name: string;
  kernel: string;
  uptime: number;
}

export function SystemDashboard() {
  const [cpuData, setCpuData] = createSignal<number[]>(Array(20).fill(0));
  const [ramData, setRamData] = createSignal<number[]>(Array(20).fill(0));
  const [networkData, setNetworkData] = createSignal<number[]>(
    Array(20).fill(0),
  );

  const [sysInfo, setSysInfo] = createSignal<SystemInfo | null>(null);

  onMount(() => {
    const fetchInfo = async () => {
      try {
        const info = await invoke<SystemInfo>("get_system_info");
        setSysInfo(info);

        setCpuData((prev) => [...prev.slice(1), info.cpu_usage]);
        setRamData((prev) => [
          ...prev.slice(1),
          info.ram_used / 1024 / 1024 / 1024,
        ]);
        setNetworkData((prev) => [
          ...prev.slice(1),
          (info.net_rx + info.net_tx) / 1024 / 1024,
        ]);
      } catch (e) {
        console.error("Failed to fetch system info", e);
      }
    };

    fetchInfo();
    const interval = setInterval(fetchInfo, 1000);
    onCleanup(() => clearInterval(interval));
  });

  const getChartOptions = (color: string) => ({
    chart: {
      type: "area" as const,
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: { enabled: false },
    },
    colors: [color],
    stroke: {
      curve: "smooth" as const,
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0,
        stops: [0, 100],
      },
    },
    tooltip: {
      fixed: { enabled: false },
      x: { show: false },
      y: {
        title: {
          formatter: () => "",
        },
      },
      marker: { show: false },
    },
  });

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  return (
    <div class="flex flex-col h-full max-w-6xl mx-auto w-full p-6 space-y-6 overflow-y-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-[var(--color-app-text-primary)] flex items-center gap-2">
            <Activity class="text-[var(--color-app-accent)]" />
            System Dashboard
          </h1>
          <p class="text-[var(--color-app-text-secondary)] text-sm mt-1">
            Real-time resource monitoring
          </p>
        </div>
      </div>

      <Show
        when={sysInfo()}
        fallback={
          <div class="text-[var(--color-app-text-secondary)]">
            Loading system data...
          </div>
        }
      >
        {(info) => (
          <>
            {/* Main Metrics Grid */}
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* CPU Card */}
              <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 shadow-sm space-y-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Cpu size={18} class="text-[var(--color-app-accent)]" />
                    <span class="font-medium text-sm text-[var(--color-app-text-primary)]">
                      CPU Usage
                    </span>
                  </div>
                  <span class="font-mono text-[var(--color-app-accent)] font-semibold">
                    {info().cpu_usage.toFixed(1)}%
                  </span>
                </div>
                <div class="h-24 w-full">
                  <SolidApexCharts
                    type="area"
                    options={getChartOptions("#4F8CFF")}
                    series={[{ data: cpuData() }]}
                    width="100%"
                    height="100%"
                  />
                </div>
                <div class="flex justify-between text-xs text-[var(--color-app-text-secondary)] font-mono">
                  <span>Cores: {info().cpu_cores}</span>
                </div>
              </div>

              {/* RAM Card */}
              <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 shadow-sm space-y-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Database
                      size={18}
                      class="text-[var(--color-app-warning)]"
                    />
                    <span class="font-medium text-sm text-[var(--color-app-text-primary)]">
                      RAM Usage
                    </span>
                  </div>
                  <span class="font-mono text-[var(--color-app-warning)] font-semibold">
                    {formatBytes(info().ram_used)}
                  </span>
                </div>
                <div class="h-24 w-full">
                  <SolidApexCharts
                    type="area"
                    options={getChartOptions("#F59E0B")}
                    series={[{ data: ramData() }]}
                    width="100%"
                    height="100%"
                  />
                </div>
                <div class="flex justify-between text-xs text-[var(--color-app-text-secondary)] font-mono">
                  <span>Total: {formatBytes(info().ram_total)}</span>
                  <span>Swap: {formatBytes(info().swap_used)}</span>
                </div>
              </div>

              {/* Network Card */}
              <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 shadow-sm space-y-4">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Wifi size={18} class="text-[var(--color-app-success)]" />
                    <span class="font-medium text-sm text-[var(--color-app-text-primary)]">
                      Network
                    </span>
                  </div>
                  <div class="flex gap-2">
                    <span class="font-mono text-[var(--color-app-success)] text-xs">
                      ↓ {formatBytes(info().net_rx)}/s
                    </span>
                    <span class="font-mono text-[var(--color-app-accent)] text-xs">
                      ↑ {formatBytes(info().net_tx)}/s
                    </span>
                  </div>
                </div>
                <div class="h-24 w-full">
                  <SolidApexCharts
                    type="area"
                    options={getChartOptions("#22C55E")}
                    series={[{ data: networkData() }]}
                    width="100%"
                    height="100%"
                  />
                </div>
                <div class="flex justify-between text-xs text-[var(--color-app-text-secondary)] font-mono">
                  <span>All Interfaces</span>
                </div>
              </div>
            </div>

            {/* Secondary Metrics */}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* System Info */}
              <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 shadow-sm space-y-4">
                <div class="flex items-center gap-2 border-b border-[var(--color-app-border)] pb-3">
                  <Info
                    size={18}
                    class="text-[var(--color-app-text-secondary)]"
                  />
                  <span class="font-medium text-sm text-[var(--color-app-text-primary)]">
                    System Information
                  </span>
                </div>
                <div class="grid grid-cols-2 gap-y-4 gap-x-8">
                  <InfoRow label="OS" value={info().os_name} />
                  <InfoRow label="Kernel" value={info().kernel} />
                  <InfoRow label="Uptime" value={formatUptime(info().uptime)} />
                  <InfoRow label="Architecture" value="x86_64 / arm64" />
                </div>
              </div>

              {/* Disk & Battery (Placeholder or Partial implementation since sysinfo disks require more logic) */}
              <div class="grid grid-cols-2 gap-6">
                <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div class="flex items-center gap-2 mb-4">
                    <HardDrive
                      size={18}
                      class="text-[var(--color-app-text-secondary)]"
                    />
                    <span class="font-medium text-sm text-[var(--color-app-text-primary)]">
                      Memory Ratio
                    </span>
                  </div>
                  <div class="space-y-2">
                    <div class="flex justify-between text-xs font-mono">
                      <span class="text-[var(--color-app-text-secondary)]">
                        Used:{" "}
                        {((info().ram_used / info().ram_total) * 100).toFixed(
                          0,
                        )}
                        %
                      </span>
                    </div>
                    <div class="w-full bg-[var(--color-app-surface-secondary)] rounded-full h-2">
                      <div
                        class="bg-[var(--color-app-accent)] h-2 rounded-full"
                        style={{
                          width: `${(info().ram_used / info().ram_total) * 100}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 shadow-sm flex flex-col justify-between">
                  <div class="flex items-center gap-2 mb-4">
                    <Battery
                      size={18}
                      class="text-[var(--color-app-text-secondary)]"
                    />
                    <span class="font-medium text-sm text-[var(--color-app-text-primary)]">
                      Swap Ratio
                    </span>
                  </div>
                  <div class="space-y-2">
                    <div class="flex justify-between text-xs font-mono">
                      <span class="text-[var(--color-app-text-secondary)]">
                        Used:{" "}
                        {info().swap_total > 0
                          ? (
                              (info().swap_used / info().swap_total) *
                              100
                            ).toFixed(0)
                          : 0}
                        %
                      </span>
                    </div>
                    <div class="w-full bg-[var(--color-app-surface-secondary)] rounded-full h-2">
                      <div
                        class="bg-[var(--color-app-success)] h-2 rounded-full"
                        style={{
                          width: `${info().swap_total > 0 ? (info().swap_used / info().swap_total) * 100 : 0}%`,
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </Show>
    </div>
  );
}

function InfoRow(props: { label: string; value: string }) {
  return (
    <div class="flex flex-col gap-1 overflow-hidden">
      <span class="text-xs text-[var(--color-app-text-secondary)]">
        {props.label}
      </span>
      <span class="text-sm font-mono text-[var(--color-app-text-primary)] truncate">
        {props.value}
      </span>
    </div>
  );
}
