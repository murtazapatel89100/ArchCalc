# ArchCalc app architecture

ArchCalc is a [Tauri 2](https://tauri.app/) desktop app. The UI is SolidJS + Tailwind CSS 4 (built with Vite); native work happens in Rust and is reached through Tauri commands.

```text
SolidJS UI  ──invoke()──▶  Tauri command (Rust)  ──▶  calculator engine / storage / system APIs
     ▲                                                              │
     └──────────────────────────── result ◀─────────────────────────┘
```

Most features are pure frontend (converters, developer tools, Quote Studio pricing, exports). Rust handles what needs to be native or fast: expression evaluation, system statistics and writing files.

## Directory map

```text
app/
├── src/                         # SolidJS frontend
│   ├── App.tsx                  # Routes (one per sidebar entry)
│   ├── index.tsx / index.css    # Entry point, theme tokens (--color-app-*), shared CSS
│   ├── components/
│   │   ├── Layout.tsx           # Sidebar + title bar shell, global shortcuts
│   │   ├── TitleBar.tsx         # Custom window controls (the window is frameless)
│   │   ├── AreaSparkline.tsx    # Live apexcharts sparkline used by System
│   │   └── ui/                  # Shared primitives: Card, Button, Field, NumberInput, Select, Modal
│   ├── screens/                 # One component per page: Dashboard, Calculator, History,
│   │                            # Workspaces, Converter, DevTools, QuoteStudio, System, Settings
│   ├── features/
│   │   └── quotes/              # Quote Studio (see below)
│   ├── types/                   # Type declarations for untyped packages
│   └── utils/                   # cn(), createLocalStorage(), command-bar evaluator
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── lib.rs               # Builder: plugins, managed state, command registration
│   │   ├── commands/            # #[tauri::command] functions (thin; delegate to modules below)
│   │   ├── calculator/          # tokenizer → parser → AST → evaluator
│   │   ├── storage/             # All filesystem access (history.json, quote exports)
│   │   ├── models/              # Serializable data types
│   │   └── errors/              # Error enums that serialize to strings for the frontend
│   ├── capabilities/default.json# Permissions granted to the window
│   └── tauri.conf.json
├── scripts/record-showcase.mjs  # Records the docs videos/screenshots (pnpm showcase)
└── vitest.config.ts             # Unit tests for pure logic
```

## Tauri commands

| Command | Module | Purpose |
| :-- | :-- | :-- |
| `evaluate(expression)` | `commands/calculator.rs` | Tokenise, parse and evaluate an expression with the Rust engine; appends it to `history.json` |
| `get_history()` | `commands/history.rs` | Read `history.json` |
| `get_system_info()` | `commands/system.rs` | CPU, memory, swap, network, OS and uptime via `sysinfo` |
| `save_export_file(path, contents)` | `commands/export.rs` | Write an exported quote to the path chosen in the save dialog. Only `.pdf`, `.docx`, `.md`, `.xlsx` and `.csv` are accepted. |

Plugins: `opener` and `dialog` (the native save dialog used by exports). Window permissions live in `capabilities/default.json`.

Errors are Rust enums (`CalculatorError`, `ExportError`) that implement `Serialize` as a string, so a failed `invoke()` rejects with a readable message.

## Where data is stored

Everything stays on the user's machine.

| Data | Where |
| :-- | :-- |
| Command-bar history and retention | `localStorage`: `archcalc_history`, `archcalc_history_retention` |
| Workspaces | `localStorage`: `archcalc_workspaces` |
| Recent conversions | `localStorage`: `archcalc_recent_conversions` |
| Sidebar badge (title, subtitle, image) | `localStorage`: `archcalc_workspace_title`, `…_subtitle`, `…_image` |
| Quote Studio products & quotes | `localStorage`: `archcalc_quotes` |
| Quote Studio settings (business, currency, template…) | `localStorage`: `archcalc_quote_settings` |
| Rust-side evaluation history | `<app data dir>/history.json` (last 100 entries) |

`utils/createLocalStorage.ts` wraps a key in a Solid signal and broadcasts a `local-storage` event so other screens re-read it. Settings → Data exports, imports and clears the keys listed in `DATA_KEYS` (`screens/SettingsScreen.tsx`) — **add new keys there** so they're included in backups.

## Quote Studio (`src/features/quotes`)

```text
features/quotes/
├── types.ts        # Product → Quote → QuoteInputs (fields, groups, materials, overheads, pricing)
├── builders.ts     # The builder registry: fields, repeatable groups, cost maths + spreadsheet formulas
├── groups.ts       # Group rows: totals, per-row cost lines, simple vs detailed quotes, upgrading old quotes
├── engine.ts       # computeQuote(): materials, overheads, profit modes, rounding, discount, tax
├── result.ts       # resultFor(builder, inputs) — ties a builder's base cost to the engine
├── store.ts        # Products in a fine-grained Solid store, persisted to localStorage
├── format.ts       # Currency and number formatting
├── components/     # QuoteWorkspace (products → quotes → editor), QuoteEditor, BreakdownPanel,
│                   # CompareView, ExportModal, MarkdownField, QuoteSettingsModal
└── export/
    ├── document.ts       # ExportDoc: one formatted model shared by every document format
    ├── markdown.ts       # ExportDoc → Markdown
    ├── markdown-render.ts# Markdown → HTML (raw HTML escaped, headings nested)
    ├── pdf.ts            # Markdown → HTML → pdfmake (templates, header band, footer)
    ├── docx.ts           # ExportDoc → Word (markdown-docx.ts converts notes to native Word blocks)
    ├── sheet.ts          # Live Excel workbook (ExcelJS) and CSV
    ├── templates.ts      # Colour templates
    └── save.ts           # Save dialog + save_export_file, or a browser download outside Tauri
```

How a price is calculated:

1. **Base cost per unit** = one line per group row (e.g. each filament spool) + the builder's other lines (electricity, labour…). See `baseLinesFor()` in `groups.ts`.
2. `computeQuote()` adds raw materials and overheads, applies the profit method and rounding, then the order quantity, discount and tax.
3. A **simple** quote (`inputs.simple`) prices only the core costs: `fieldsFor()` hides fields marked `detailed`, `extraLinesFor()` drops `detailed` base lines and `pricedInputs()` ignores overheads. The hidden values stay saved, so switching back to detailed restores them.
4. The UI, every export and the spreadsheet read from the same result, so they always agree.

The store keeps products in a Solid `createStore` so editing one field updates only that field (inputs keep focus). Quotes from older versions are upgraded on load by `normalizeInputs()` — for example a single-spool 3D print quote becomes a one-row Filaments list with the same price.

### Adding a Quote Studio builder

1. Add an entry to `builders` in `builders.ts`:
   - `fields` — single-value inputs (`currency`, `number` with a `suffix`, or `percent`). Mark extras such as power draw or labour `detailed: true` so simple quotes leave them out.
   - `groups` (optional) — repeatable rows, each with its own `fields`, `defaults`, a `rowCost` function and the same maths as a spreadsheet `rowFormula`.
   - `baseCost` — any other per-unit cost lines, and `baseFormulas` — the same lines as Excel formulas, in the same order. A line that uses detailed fields must be marked `detailed` too; the sheet export throws if a simple quote would reference a hidden field.
   - `defaults` for materials, overheads and profit; `unitLabel` (e.g. `"item"`, `"plate"`).
2. Run `pnpm test`. `export/sheet.test.ts` recalculates every builder's spreadsheet formulas and fails if they disagree with `rowCost` / `baseCost`.
3. If you change the shape of an existing builder, add a `migrate` function so quotes saved by earlier versions keep their numbers, and a test for it.
4. Document it in `web/content/docs/quote-studio.mdx`.

## Conventions

- **SolidJS, not React** — use `createSignal`, `createMemo`, `createEffect`, `<Show>`, `<For>`; props are reactive getters, so don't destructure them.
- **System access goes through Tauri commands**; filesystem code lives in `src-tauri/src/storage/`.
- **Rust:** handle every `Result`, no `unwrap()` without a reason, and zero `cargo clippy -D warnings`.
- **Styling:** Tailwind classes with the `--color-app-*` tokens from `index.css`; combine classes with `cn()`.
- **Where does new code go?**

  | Code | Place |
  | :-- | :-- |
  | A new page | `src/screens/` + a route in `App.tsx` + an entry in `Layout.tsx` |
  | A self-contained feature with its own logic | `src/features/<name>/` |
  | A reusable UI primitive | `src/components/ui/` |
  | A Tauri command | `src-tauri/src/commands/` (keep it thin) |
  | Maths / parsing | `src-tauri/src/calculator/` |
  | Reading or writing files | `src-tauri/src/storage/` |

## Testing

- `pnpm test` runs Vitest over `src/**/*.test.ts` in Node — keep logic you want to test free of DOM and Tauri imports.
- `cargo test` runs the Rust unit tests in `src-tauri/`.
- CI (`.github/workflows/ci.yml`) runs Biome on `app/` and `web/`, `cargo fmt --check` and `cargo clippy -D warnings`.
