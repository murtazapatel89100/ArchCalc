import { invoke } from "@tauri-apps/api/core";
import {
  Check,
  Copy,
  Delete,
  Divide,
  Equal,
  Minus,
  Percent,
  Plus,
  RotateCcw,
  X,
} from "lucide-solid";
import {
  createMemo,
  createSignal,
  For,
  type JSX,
  onCleanup,
  onMount,
  Show,
} from "solid-js";
import { Transition } from "solid-transition-group";
import { cn } from "../utils/cn";

type ButtonVariant =
  | "number"
  | "operator"
  | "action"
  | "equals"
  | "clear"
  | "fn"
  | "deg";

interface CalcButton {
  label: string | (() => string);
  value: string | (() => string);
  variant: ButtonVariant;
  icon?: JSX.Element;
}

const standardButtons: CalcButton[][] = [
  [
    {
      label: "AC",
      value: "AC",
      variant: "clear",
      icon: <RotateCcw size={14} />,
    },
    { label: "⌫", value: "DEL", variant: "action", icon: <Delete size={16} /> },
    { label: "%", value: "%", variant: "action", icon: <Percent size={14} /> },
    { label: "÷", value: "/", variant: "operator", icon: <Divide size={16} /> },
  ],
  [
    { label: "7", value: "7", variant: "number" },
    { label: "8", value: "8", variant: "number" },
    { label: "9", value: "9", variant: "number" },
    { label: "×", value: "*", variant: "operator", icon: <X size={16} /> },
  ],
  [
    { label: "4", value: "4", variant: "number" },
    { label: "5", value: "5", variant: "number" },
    { label: "6", value: "6", variant: "number" },
    { label: "−", value: "-", variant: "operator", icon: <Minus size={16} /> },
  ],
  [
    { label: "1", value: "1", variant: "number" },
    { label: "2", value: "2", variant: "number" },
    { label: "3", value: "3", variant: "number" },
    { label: "+", value: "+", variant: "operator", icon: <Plus size={16} /> },
  ],
  [
    { label: "±", value: "NEGATE", variant: "action" },
    { label: "0", value: "0", variant: "number" },
    { label: ".", value: ".", variant: "number" },
    { label: "=", value: "=", variant: "equals", icon: <Equal size={16} /> },
  ],
];

async function evaluate(expression: string): Promise<string> {
  try {
    // Allow: numbers, operators, parens, dot, space, percent, letters (function names), ^
    const sanitized = expression.replace(/[^0-9+\-*/.() %a-zA-Z^]/g, "");
    if (!sanitized.trim()) return "";
    const withPercent = sanitized.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");

    const result = await invoke<string>("evaluate", {
      expression: withPercent,
    });

    const num = parseFloat(result);
    if (!Number.isNaN(num) && Number.isFinite(num)) {
      return num.toLocaleString("en-US", { maximumFractionDigits: 10 });
    }
    return result;
  } catch {
    return "Error";
  }
}

export function CalculatorScreen() {
  const [display, setDisplay] = createSignal("0");
  const [expression, setExpression] = createSignal("");
  const [previousExpression, setPreviousExpression] = createSignal("");
  const [previousResult, setPreviousResult] = createSignal("");
  const [justEvaluated, setJustEvaluated] = createSignal(false);
  const [copied, setCopied] = createSignal(false);
  const [activeKey, setActiveKey] = createSignal<string | null>(null);
  const [isDeg, setIsDeg] = createSignal(false);

  // Scientific buttons derived from DEG/RAD mode
  const scientificButtons = createMemo<CalcButton[][]>(() => [
    [
      { label: "sin", value: isDeg() ? "sind(" : "sin(", variant: "fn" },
      { label: "cos", value: isDeg() ? "cosd(" : "cos(", variant: "fn" },
      { label: "tan", value: isDeg() ? "tand(" : "tan(", variant: "fn" },
      { label: "(", value: "(", variant: "action" },
    ],
    [
      { label: "asin", value: isDeg() ? "asind(" : "asin(", variant: "fn" },
      { label: "acos", value: isDeg() ? "acosd(" : "acos(", variant: "fn" },
      { label: "atan", value: isDeg() ? "atand(" : "atan(", variant: "fn" },
      { label: ")", value: ")", variant: "action" },
    ],
    [
      { label: "log", value: "log(", variant: "fn" },
      { label: "ln", value: "ln(", variant: "fn" },
      { label: "√", value: "sqrt(", variant: "fn" },
      { label: "^", value: "^", variant: "operator" },
    ],
    [
      { label: "π", value: "pi", variant: "fn" },
      { label: "e", value: "e", variant: "fn" },
      { label: "x²", value: "^2", variant: "fn" },
      { label: "n!", value: "factorial(", variant: "fn" },
    ],
  ]);

  const FUNCTION_PREFIXES = [
    "sind(",
    "cosd(",
    "tand(",
    "asind(",
    "acosd(",
    "atand(",
    "sin(",
    "cos(",
    "tan(",
    "asin(",
    "acos(",
    "atan(",
    "log(",
    "ln(",
    "sqrt(",
    "factorial(",
    "abs(",
    "exp(",
    "ceil(",
    "floor(",
    "round(",
  ];

  const handleInput = (value: string) => {
    setActiveKey(value);
    setTimeout(() => setActiveKey(null), 120);

    if (value === "AC") {
      setDisplay("0");
      setExpression("");
      setPreviousExpression("");
      setPreviousResult("");
      setJustEvaluated(false);
      return;
    }

    if (value === "TOGGLE_DEG") {
      setIsDeg((v) => !v);
      return;
    }

    if (value === "DEL") {
      if (justEvaluated()) return;
      setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : "0"));
      setExpression((prev) => (prev.length > 1 ? prev.slice(0, -1) : ""));
      return;
    }

    if (value === "NEGATE") {
      setDisplay((prev) => {
        if (prev === "0" || prev === "Error") return prev;
        return prev.startsWith("-") ? prev.slice(1) : `-${prev}`;
      });
      setExpression((prev) => {
        if (!prev || prev === "0") return prev;
        return prev.startsWith("-") ? prev.slice(1) : `-${prev}`;
      });
      return;
    }

    if (value === "=") {
      const exp = expression();
      if (!exp) return;
      evaluate(exp).then((result) => {
        setPreviousExpression(exp);
        setPreviousResult(result);
        setDisplay(result);
        setExpression(result === "Error" ? "" : result.replace(/,/g, ""));
        setJustEvaluated(true);

        if (result !== "Error") {
          const storedStr = localStorage.getItem("archcalc_history") || "[]";
          let h = [];
          try {
            h = JSON.parse(storedStr);
          } catch (e) {}
          const now = new Date();
          const newItem = {
            id: crypto.randomUUID(),
            title: "Calculation",
            expression: exp,
            result: result,
            tags: ["Calculation"],
            time: now.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            timestamp: now.getTime(),
          };

          let newHistory = [newItem, ...h];
          const retentionDaysStr =
            localStorage.getItem("archcalc_history_retention") || "30";
          const retention = Number(retentionDaysStr);
          if (retention > 0) {
            const cutoff = now.getTime() - retention * 24 * 60 * 60 * 1000;
            newHistory = newHistory.filter(
              (item: any) => item.timestamp > cutoff,
            );
          }

          localStorage.setItem("archcalc_history", JSON.stringify(newHistory));
          window.dispatchEvent(new Event("local-storage"));
        }
      });
      return;
    }

    const isSimpleOperator = ["+", "-", "*", "/"].includes(value);
    const isFunctionOrParen =
      FUNCTION_PREFIXES.includes(value) || value === "(";

    if (justEvaluated()) {
      if (isSimpleOperator) {
        setExpression((prev) => prev + value);
        setDisplay(value);
        setJustEvaluated(false);
      } else {
        setExpression(value);
        setDisplay(isFunctionOrParen ? value : value);
        setJustEvaluated(false);
      }
      return;
    }

    // Prevent starting with a plain operator (except minus)
    if (isSimpleOperator && !expression() && value !== "-") return;

    // Prevent double operator
    if (
      isSimpleOperator &&
      expression() &&
      ["+", "-", "*", "/"].includes(expression().slice(-1))
    ) {
      setExpression((prev) => prev.slice(0, -1) + value);
      setDisplay(value);
      return;
    }

    // Prevent double dot in current number segment
    if (value === ".") {
      const parts = expression().split(/[+\-*/^(]/);
      const lastPart = parts[parts.length - 1];
      if (lastPart.includes(".")) return;
    }

    setExpression((prev) =>
      prev === "0" && value !== "." && !isSimpleOperator && !isFunctionOrParen
        ? value
        : prev + value,
    );

    if (isSimpleOperator) {
      setDisplay(value);
    } else if (isFunctionOrParen) {
      setDisplay(value);
    } else {
      setDisplay((prev) => {
        if (prev === "0" && value !== ".") return value;
        if (["+", "-", "×", "÷", "*", "/", "%"].includes(prev)) return value;
        return prev + value;
      });
    }
  };

  onMount(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key;
      if (key >= "0" && key <= "9") {
        e.preventDefault();
        handleInput(key);
      } else if (key === ".") {
        e.preventDefault();
        handleInput(".");
      } else if (key === "+") {
        e.preventDefault();
        handleInput("+");
      } else if (key === "-") {
        e.preventDefault();
        handleInput("-");
      } else if (key === "*") {
        e.preventDefault();
        handleInput("*");
      } else if (key === "/") {
        e.preventDefault();
        handleInput("/");
      } else if (key === "%") {
        e.preventDefault();
        handleInput("%");
      } else if (key === "^") {
        e.preventDefault();
        handleInput("^");
      } else if (key === "(") {
        e.preventDefault();
        handleInput("(");
      } else if (key === ")") {
        e.preventDefault();
        handleInput(")");
      } else if (key === "Enter" || key === "=") {
        e.preventDefault();
        handleInput("=");
      } else if (key === "Backspace") {
        e.preventDefault();
        handleInput("DEL");
      } else if (key === "Escape") {
        e.preventDefault();
        handleInput("AC");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    onCleanup(() => window.removeEventListener("keydown", handleKeyDown));
  });

  const handleCopy = () => {
    const text = display() === "Error" ? "" : display();
    navigator.clipboard?.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formattedExpression = () =>
    expression()
      .replace(/sind\(/g, "sin(")
      .replace(/cosd\(/g, "cos(")
      .replace(/tand\(/g, "tan(")
      .replace(/asind\(/g, "asin(")
      .replace(/acosd\(/g, "acos(")
      .replace(/atand\(/g, "atan(")
      .replace(/sqrt\(/g, "√(")
      .replace(/\*/g, " × ")
      .replace(/\//g, " ÷ ")
      .replace(/\+/g, " + ")
      .replace(/-/g, " − ")
      .replace(/%/g, "%");

  const getButtonStyles = (
    variant: ButtonVariant,
    value: string | (() => string),
  ) => {
    const resolvedValue = typeof value === "function" ? value() : value;
    const isActive = activeKey() === resolvedValue;
    const base =
      "relative flex items-center justify-center rounded-xl font-medium transition-all duration-150 select-none cursor-pointer active:scale-95 text-sm ";

    switch (variant) {
      case "number":
        return cn(
          base,
          "bg-[var(--color-app-surface-secondary)] text-[var(--color-app-text-primary)] hover:bg-[var(--color-app-border)] border border-[var(--color-app-border)]/50",
          isActive && "bg-[var(--color-app-border)] scale-95",
        );
      case "operator":
        return cn(
          base,
          "bg-[var(--color-app-accent)]/15 text-[var(--color-app-accent)] hover:bg-[var(--color-app-accent)]/25 border border-[var(--color-app-accent)]/20",
          isActive && "bg-[var(--color-app-accent)]/30 scale-95",
        );
      case "action":
        return cn(
          base,
          "bg-[var(--color-app-surface)] text-[var(--color-app-text-secondary)] hover:bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)]/50 hover:text-[var(--color-app-text-primary)]",
          isActive && "bg-[var(--color-app-surface-secondary)] scale-95",
        );
      case "fn":
        return cn(
          base,
          "bg-[var(--color-app-surface)] text-[var(--color-app-text-secondary)] hover:bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)]/50 hover:text-[var(--color-app-accent)] font-mono",
          isActive &&
            "bg-[var(--color-app-surface-secondary)] scale-95 text-[var(--color-app-accent)]",
        );
      case "deg":
        return cn(
          base,
          "border font-semibold",
          isDeg()
            ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
            : "bg-[var(--color-app-surface)] text-[var(--color-app-text-secondary)] border-[var(--color-app-border)]/50 hover:bg-[var(--color-app-surface-secondary)]",
          isActive && "scale-95",
        );
      case "equals":
        return cn(
          base,
          "bg-gradient-to-br from-[var(--color-app-accent)] to-blue-600 text-white hover:from-[var(--color-app-accent)]/90 hover:to-blue-700 shadow-lg shadow-[var(--color-app-accent)]/25 border border-[var(--color-app-accent)]/50",
          isActive && "shadow-[var(--color-app-accent)]/40 scale-95",
        );
      case "clear":
        return cn(
          base,
          "bg-[var(--color-app-error)]/10 text-[var(--color-app-error)] hover:bg-[var(--color-app-error)]/20 border border-[var(--color-app-error)]/20",
          isActive && "bg-[var(--color-app-error)]/25 scale-95",
        );
    }
  };

  return (
    <div class="flex flex-col h-full w-full overflow-hidden">
      {/* Page Header */}
      <header class="h-14 flex items-center justify-between px-6 border-b border-[var(--color-app-border)] bg-[var(--color-app-surface)]/50 backdrop-blur-md sticky top-0 z-10">
        <div class="flex items-center gap-3">
          <div class="w-7 h-7 rounded bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <span class="text-sm font-bold">Σ</span>
          </div>
          <span class="font-semibold text-[var(--color-app-text-primary)]">
            Scientific Calculator
          </span>
        </div>
        <div class="flex items-center gap-1.5 text-xs text-[var(--color-app-text-secondary)]">
          <kbd class="px-1.5 py-0.5 rounded bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] font-mono">
            0–9
          </kbd>
          <span>numbers</span>
          <kbd class="px-1.5 py-0.5 rounded bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] font-mono ml-2">
            Enter
          </kbd>
          <span>evaluate</span>
          <kbd class="px-1.5 py-0.5 rounded bg-[var(--color-app-surface-secondary)] border border-[var(--color-app-border)] font-mono ml-2">
            Esc
          </kbd>
          <span>clear</span>
        </div>
      </header>

      {/* Main Content */}
      <div class="flex-1 flex items-center justify-center p-4 overflow-auto">
        <div class="w-full max-w-sm flex flex-col gap-3 transition-all duration-300">
          {/* Display */}
          <div class="bg-[var(--color-app-surface)] border border-[var(--color-app-border)] rounded-2xl p-5 shadow-2xl shadow-black/20 relative overflow-hidden">
            <div class="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[var(--color-app-accent)]/5 to-transparent pointer-events-none" />

            <Transition
              onEnter={(el, done) => {
                const a = el.animate(
                  [
                    { opacity: 0, transform: "translateY(-8px)" },
                    { opacity: 1, transform: "translateY(0)" },
                  ],
                  { duration: 200 },
                );
                a.finished.then(done);
              }}
              onExit={(el, done) => {
                const a = el.animate(
                  [
                    { opacity: 1, transform: "translateY(0)" },
                    { opacity: 0, transform: "translateY(-8px)" },
                  ],
                  { duration: 200 },
                );
                a.finished.then(done);
              }}
            >
              <Show when={previousExpression()}>
                <div class="text-xs font-mono text-[var(--color-app-text-secondary)]/60 mb-1 text-right truncate relative z-10">
                  {previousExpression()
                    .replace(/sind\(/g, "sin(")
                    .replace(/cosd\(/g, "cos(")
                    .replace(/tand\(/g, "tan(")
                    .replace(/asind\(/g, "asin(")
                    .replace(/acosd\(/g, "acos(")
                    .replace(/atand\(/g, "atan(")
                    .replace(/sqrt\(/g, "√(")
                    .replace(/\*/g, "×")
                    .replace(/\//g, "÷")}{" "}
                  = {previousResult()}
                </div>
              </Show>
            </Transition>

            <div class="text-xs font-mono text-[var(--color-app-text-secondary)] text-right min-h-[1.25rem] truncate relative z-10">
              {formattedExpression() || " "}
            </div>

            <div class="relative z-10">
              <div
                class={cn(
                  "text-right font-semibold tracking-tight mt-2 transition-all duration-200 truncate",
                  display().length > 12
                    ? "text-3xl"
                    : display().length > 8
                      ? "text-4xl"
                      : "text-5xl",
                  display() === "Error"
                    ? "text-[var(--color-app-error)]"
                    : "text-[var(--color-app-text-primary)]",
                )}
              >
                {display()}
              </div>
            </div>

            <div class="flex justify-end mt-2 relative z-10">
              <button
                onClick={handleCopy}
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium text-[var(--color-app-text-secondary)] hover:text-[var(--color-app-text-primary)] hover:bg-[var(--color-app-surface-secondary)] transition-all border border-transparent hover:border-[var(--color-app-border)]"
              >
                <Show
                  when={copied()}
                  fallback={
                    <>
                      <Copy size={12} />
                      <span>Copy</span>
                    </>
                  }
                >
                  <Check size={12} class="text-[var(--color-app-success)]" />
                  <span class="text-[var(--color-app-success)]">Copied</span>
                </Show>
              </button>
            </div>
          </div>

          {/* DEG/RAD Toggle */}
          <button
            onClick={() => handleInput("TOGGLE_DEG")}
            class={cn(
              "w-full py-1.5 rounded-xl text-xs font-semibold tracking-wider border transition-all duration-200",
              isDeg()
                ? "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                : "bg-[var(--color-app-surface)] text-[var(--color-app-text-secondary)] border-[var(--color-app-border)]/50 hover:bg-[var(--color-app-surface-secondary)] hover:text-[var(--color-app-text-primary)]",
            )}
          >
            {isDeg() ? "DEG" : "RAD"}
          </button>

          {/* Scientific Button Grid */}
          <div class="grid grid-cols-4 gap-1.5">
            <For each={scientificButtons().flat()}>
              {(btn) => (
                <button
                  onClick={() => {
                    const v =
                      typeof btn.value === "function" ? btn.value() : btn.value;
                    handleInput(v);
                  }}
                  class={cn(getButtonStyles(btn.variant, btn.value), "h-10")}
                >
                  {typeof btn.label === "function" ? btn.label() : btn.label}
                </button>
              )}
            </For>
          </div>

          {/* Divider */}
          <div class="border-t border-[var(--color-app-border)]/50" />

          {/* Standard Button Grid */}
          <div class="grid grid-cols-4 gap-2">
            <For each={standardButtons.flat()}>
              {(btn) => (
                <button
                  onClick={() => handleInput(btn.value as string)}
                  class={cn(
                    getButtonStyles(btn.variant, btn.value as string),
                    "h-14",
                  )}
                >
                  {btn.icon ||
                    (typeof btn.label === "function" ? btn.label() : btn.label)}
                </button>
              )}
            </For>
          </div>

          <p class="text-center text-xs text-[var(--color-app-text-secondary)]/50">
            Use your keyboard for quick input · ( ) ^ supported
          </p>
        </div>
      </div>
    </div>
  );
}
