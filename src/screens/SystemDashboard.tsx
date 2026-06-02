import { Activity, Cpu, Database, Wifi, Battery, Server, Info, HardDrive } from "lucide-solid";
import { SolidApexCharts } from "solid-apexcharts";
import { createSignal, onMount } from "solid-js";
import { cn } from "../utils/cn";

const generateData = () => Array.from({ length: 20 }, (_, i) => Math.floor(Math.random() * 60) + 20);

export function SystemDashboard() {
  const [cpuData, setCpuData] = createSignal(generateData());
  const [ramData, setRamData] = createSignal(generateData());
  const [networkData, setNetworkData] = createSignal(generateData());

  const getChartOptions = (color: string) => ({
    chart: {
      type: 'line',
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: { enabled: false }
    },
    stroke: {
      curve: 'smooth',
      width: 2,
      colors: [color]
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0,
        stops: [0, 100]
      }
    },
    tooltip: {
      fixed: { enabled: false },
      x: { show: false },
      y: {
        title: {
          formatter: function (seriesName: any) {
            return ''
          }
        }
      },
      marker: { show: false }
    }
  });

  return (
    <div class="flex flex-col h-full max-w-6xl mx-auto w-full p-6 space-y-6 overflow-y-auto">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-[var(--color-app-text-primary)] flex items-center gap-2">
            <Activity class="text-[var(--color-app-accent)]" />
            System Dashboard
          </h1>
          <p class="text-[var(--color-app-text-secondary)] text-sm mt-1">Real-time resource monitoring</p>
        </div>
      </div>

      {/* Main Metrics Grid */}
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        
        {/* CPU Card */}
        <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Cpu size={18} class="text-[var(--color-app-accent)]" />
              <span class="font-medium text-sm text-[var(--color-app-text-primary)]">CPU Usage</span>
            </div>
            <span class="font-mono text-[var(--color-app-accent)] font-semibold">42%</span>
          </div>
          <div class="h-24 w-full">
            <SolidApexCharts 
              type="area" 
              options={getChartOptions('var(--color-app-accent)')} 
              series={[{ data: cpuData() }]} 
              width="100%" 
              height="100%" 
            />
          </div>
          <div class="flex justify-between text-xs text-[var(--color-app-text-secondary)] font-mono">
            <span>Cores: 16</span>
            <span>Freq: 3.2 GHz</span>
          </div>
        </div>

        {/* RAM Card */}
        <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Database size={18} class="text-[var(--color-app-warning)]" />
              <span class="font-medium text-sm text-[var(--color-app-text-primary)]">RAM Usage</span>
            </div>
            <span class="font-mono text-[var(--color-app-warning)] font-semibold">16.4 GB</span>
          </div>
          <div class="h-24 w-full">
            <SolidApexCharts 
              type="area" 
              options={getChartOptions('var(--color-app-warning)')} 
              series={[{ data: ramData() }]} 
              width="100%" 
              height="100%" 
            />
          </div>
          <div class="flex justify-between text-xs text-[var(--color-app-text-secondary)] font-mono">
            <span>Total: 32 GB</span>
            <span>Swap: 2.1 GB</span>
          </div>
        </div>

        {/* Network Card */}
        <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 shadow-sm space-y-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <Wifi size={18} class="text-[var(--color-app-success)]" />
              <span class="font-medium text-sm text-[var(--color-app-text-primary)]">Network</span>
            </div>
            <div class="flex gap-2">
              <span class="font-mono text-[var(--color-app-success)] text-xs">↓ 1.2 MB/s</span>
              <span class="font-mono text-[var(--color-app-accent)] text-xs">↑ 0.4 MB/s</span>
            </div>
          </div>
          <div class="h-24 w-full">
            <SolidApexCharts 
              type="area" 
              options={getChartOptions('var(--color-app-success)')} 
              series={[{ data: networkData() }]} 
              width="100%" 
              height="100%" 
            />
          </div>
          <div class="flex justify-between text-xs text-[var(--color-app-text-secondary)] font-mono">
            <span>eth0</span>
            <span>Ping: 12ms</span>
          </div>
        </div>

      </div>

      {/* Secondary Metrics */}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        
        {/* System Info */}
        <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 shadow-sm space-y-4">
          <div class="flex items-center gap-2 border-b border-[var(--color-app-border)] pb-3">
            <Info size={18} class="text-[var(--color-app-text-secondary)]" />
            <span class="font-medium text-sm text-[var(--color-app-text-primary)]">System Information</span>
          </div>
          <div class="grid grid-cols-2 gap-y-4 gap-x-8">
            <InfoRow label="OS" value="Arch Linux x86_64" />
            <InfoRow label="Kernel" value="6.8.9-arch1-1" />
            <InfoRow label="Uptime" value="14d 2h 45m" />
            <InfoRow label="Packages" value="1245 (pacman)" />
            <InfoRow label="Shell" value="zsh 5.9" />
            <InfoRow label="DE" value="GNOME 46" />
          </div>
        </div>

        {/* Disk & Battery */}
        <div class="grid grid-cols-2 gap-4">
          <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-4">
              <HardDrive size={18} class="text-[var(--color-app-text-secondary)]" />
              <span class="font-medium text-sm text-[var(--color-app-text-primary)]">Disk (/)</span>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between text-xs font-mono">
                <span class="text-[var(--color-app-text-secondary)]">Used: 450 GB</span>
                <span class="text-[var(--color-app-text-primary)]">Total: 1 TB</span>
              </div>
              <div class="w-full bg-[var(--color-app-surface-secondary)] rounded-full h-2">
                <div class="bg-[var(--color-app-accent)] h-2 rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>
          
          <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-xl p-5 shadow-sm flex flex-col justify-between">
            <div class="flex items-center gap-2 mb-4">
              <Battery size={18} class="text-[var(--color-app-text-secondary)]" />
              <span class="font-medium text-sm text-[var(--color-app-text-primary)]">Battery</span>
            </div>
            <div class="space-y-2">
              <div class="flex justify-between text-xs font-mono">
                <span class="text-[var(--color-app-text-secondary)]">Charging</span>
                <span class="text-[var(--color-app-success)] font-medium">84%</span>
              </div>
              <div class="w-full bg-[var(--color-app-surface-secondary)] rounded-full h-2">
                <div class="bg-[var(--color-app-success)] h-2 rounded-full" style={{ width: '84%' }}></div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function InfoRow(props: { label: string, value: string }) {
  return (
    <div class="flex flex-col gap-1">
      <span class="text-xs text-[var(--color-app-text-secondary)]">{props.label}</span>
      <span class="text-sm font-mono text-[var(--color-app-text-primary)]">{props.value}</span>
    </div>
  );
}
