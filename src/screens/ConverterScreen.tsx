import { createSignal, createEffect, onCleanup, For, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Search, Ruler, Weight, Thermometer, HardDrive, DollarSign, ArrowRightLeft } from "lucide-solid";
import { evaluator } from "../utils/evaluator";
import { createLocalStorage } from "../utils/createLocalStorage";
import { cn } from "../utils/cn";

const categories = [
  { id: "length", name: "Length", icon: Ruler, units: ["mm", "cm", "m", "km", "in", "ft", "yd", "mi"] },
  { id: "weight", name: "Weight", icon: Weight, units: ["mg", "g", "kg", "t", "oz", "lb"] },
  { id: "temp", name: "Temperature", icon: Thermometer, units: ["c", "f", "k"] },
  { id: "storage", name: "Storage", icon: HardDrive, units: ["b", "kb", "mb", "gb", "tb", "pb"] },
];

export function ConverterScreen() {
  const [activeCategory, setActiveCategory] = createSignal(categories[0]);
  const [fromUnit, setFromUnit] = createSignal(categories[0].units[2]); // m
  const [toUnit, setToUnit] = createSignal(categories[0].units[3]); // km
  const [inputValue, setInputValue] = createSignal("1");
  const [outputValue, setOutputValue] = createSignal("");
  const [recent, setRecent] = createLocalStorage<any[]>("archcalc_recent_conversions", []);

  // Update units when category changes
  const handleCategoryChange = (cat: typeof categories[0]) => {
    setActiveCategory(cat);
    setFromUnit(cat.units[0]);
    setToUnit(cat.units[1] || cat.units[0]);
  };

  const handleSwap = () => {
    const temp = fromUnit();
    setFromUnit(toUnit());
    setToUnit(temp);
  };

  createEffect(() => {
    const val = parseFloat(inputValue());
    if (isNaN(val)) {
      setOutputValue("");
      return;
    }
    const result = evaluator.convert(val, fromUnit(), toUnit());
    if (result !== null) {
      setOutputValue(result);
      
      // Debounce saving to recent conversions
      const timer = setTimeout(() => {
        const newConv = { from: `${val} ${fromUnit().toUpperCase()}`, to: result, type: activeCategory().name, id: Date.now() };
        // @ts-ignore
        setRecent(prev => [newConv, ...prev.filter(c => c.from !== newConv.from)].slice(0, 4));
      }, 1000);
      onCleanup(() => clearTimeout(timer));
    } else {
      setOutputValue("Error");
    }
  });

  return (
    <div class="flex flex-col h-full max-w-4xl mx-auto w-full p-6 space-y-8 overflow-y-auto">
      <div class="flex items-center justify-between">
        <h1 class="text-2xl font-semibold tracking-tight">Unit Converter</h1>
      </div>

      <div class="relative">
        <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-muted-foreground">
          <Search size={18} />
        </div>
        <input
          type="text"
          placeholder="Search units (e.g. 'km to miles', '100 usd in eur')..."
          class="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-4 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 shadow-sm bg-[var(--color-app-surface)] text-[var(--color-app-text-primary)] border-[var(--color-app-border)]"
        />
      </div>

      <div class="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
        <For each={categories}>
          {(cat) => (
            <button
              onClick={() => handleCategoryChange(cat)}
              class={cn(
                "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all border",
                cat.id === activeCategory().id 
                  ? "bg-[var(--color-app-accent)]/10 border-[var(--color-app-accent)]/20 text-[var(--color-app-accent)] shadow-sm" 
                  : "bg-[var(--color-app-surface)] border-[var(--color-app-border)] text-[var(--color-app-text-secondary)] hover:bg-[var(--color-app-surface-secondary)]/50 hover:text-[var(--color-app-text-primary)]"
              )}
            >
              <Dynamic component={cat.icon} size={16} />
              {cat.name}
            </button>
          )}
        </For>
      </div>

      {/* Main Conversion Interface */}
      <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-2xl p-6 shadow-sm">
        <div class="grid grid-cols-[1fr_auto_1fr] gap-6 items-center">
          
          <div class="space-y-3">
            <label class="text-xs font-medium text-[var(--color-app-text-primary)] uppercase tracking-wider">From</label>
            <div class="flex flex-col gap-2">
              <select 
                value={fromUnit()}
                onChange={(e) => setFromUnit(e.currentTarget.value)}
                class="bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-app-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-app-accent)]/50 outline-none w-full uppercase"
              >
                <For each={activeCategory().units}>
                  {(u) => <option value={u}>{u}</option>}
                </For>
              </select>
              <input 
                type="text" 
                value={inputValue()}
                onInput={(e) => setInputValue(e.currentTarget.value)}
                class="bg-transparent text-4xl font-mono text-[var(--color-app-text-primary)] focus:outline-none w-full border-b border-transparent focus:border-[var(--color-app-accent)]/30 transition-colors py-2"
              />
            </div>
          </div>

          <div class="flex items-center justify-center pt-8">
            <button 
              onClick={handleSwap}
              class="w-10 h-10 rounded-full bg-[var(--color-app-surface-secondary)] flex items-center justify-center text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-text-primary)] hover:bg-[var(--color-app-surface-secondary)]/80 transition-colors"
            >
              <ArrowRightLeft size={18} />
            </button>
          </div>

          <div class="space-y-3">
            <label class="text-xs font-medium text-[var(--color-app-text-primary)] uppercase tracking-wider">To</label>
            <div class="flex flex-col gap-2">
              <select 
                value={toUnit()}
                onChange={(e) => setToUnit(e.currentTarget.value)}
                class="bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] rounded-lg px-3 py-2 text-sm text-[var(--color-app-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-app-accent)]/50 outline-none w-full uppercase"
              >
                <For each={activeCategory().units}>
                  {(u) => <option value={u}>{u}</option>}
                </For>
              </select>
              <div class="text-4xl font-mono text-[var(--color-app-accent)] py-2 border-b border-transparent truncate">
                {outputValue() || "0.00"}
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Recent Conversions */}
      <div class="space-y-4">
        <h3 class="text-sm font-medium text-[var(--color-app-text-secondary)] uppercase tracking-wider">Recent Conversions</h3>
        <div class="grid gap-3 sm:grid-cols-2">
          <For each={recent()}>
            {(conv) => (
              <RecentConversionCard from={conv.from} to={conv.to} type={conv.type} />
            )}
          </For>
          <Show when={recent().length === 0}>
            <p class="text-sm text-[var(--color-app-text-secondary)] col-span-2">No recent conversions.</p>
          </Show>
        </div>
      </div>
    </div>
  );
}

function RecentConversionCard(props: { from: string, to: string, type: string }) {
  return (
    <div class="bg-[var(--color-app-surface)]/50 border border-[var(--color-app-border)] rounded-xl p-4 flex items-center justify-between hover:bg-[var(--color-app-surface)] hover:border-[var(--color-app-accent)]/30 transition-all cursor-pointer group">
      <div class="flex flex-col gap-1.5 min-w-0">
        <div class="flex items-center gap-3 overflow-hidden">
          <span class="font-mono text-[var(--color-app-text-primary)] truncate">{props.from}</span>
          <ArrowRightLeft size={14} class="text-[var(--color-app-text-secondary)] group-hover:text-[var(--color-app-accent)] transition-colors shrink-0" />
          <span class="font-mono text-[var(--color-app-text-primary)] font-medium truncate">{props.to}</span>
        </div>
        <span class="text-xs text-[var(--color-app-text-secondary)]">{props.type}</span>
      </div>
    </div>
  );
}
