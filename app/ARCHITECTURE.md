# Calculator Architecture

## Overview

This application follows a clear separation between:

```text
Frontend (SolidJS)
        ↓
Tauri IPC
        ↓
Backend (Rust)
```

Responsibilities:

```text
Frontend
    UI
    User interactions
    State management

Rust
    Business logic
    Calculation engine
    File storage
    Native desktop features
```

---

# Root Structure

```text
calculator/
│
├── src/
├── src-tauri/
│
├── package.json
├── tsconfig.json
├── vite.config.ts
│
└── README.md
```

---

# Frontend Structure

```text
src/
│
├── App.tsx
├── main.tsx
│
├── components/
├── pages/
├── stores/
├── services/
├── hooks/
├── types/
└── lib/
```

---

# App.tsx

Application entry component.

Responsibilities:

* Mount pages
* Global layouts
* Top-level providers

Example:

```tsx
function App() {
  return <CalculatorPage />;
}
```

Should NOT contain:

* Business logic
* Calculator engine
* File operations

---

# main.tsx

Frontend bootstrap file.

Responsibilities:

* Mount Solid application

Example:

```tsx
render(
  () => <App />,
  document.getElementById("root")!
);
```

Usually remains very small.

---

# components/

Reusable UI components.

Structure:

```text
components/
│
├── Display.tsx
├── Keypad.tsx
├── History.tsx
└── SettingsModal.tsx
```

Responsibilities:

* Rendering UI
* Handling local component interactions

Example:

```tsx
export function Display() {
  return (
    <div>{props.value}</div>
  );
}
```

Components should not:

* Call filesystem APIs
* Parse expressions
* Contain complex business logic

---

# pages/

Screen-level components.

Structure:

```text
pages/
│
├── CalculatorPage.tsx
└── SettingsPage.tsx
```

Responsibilities:

* Compose multiple components
* Coordinate page state

Example:

```tsx
<Display />
<Keypad />
<History />
```

Think of pages as screens.

---

# stores/

Application state.

Structure:

```text
stores/
│
└── calculator.ts
```

Responsibilities:

* Current input
* Current result
* History state
* Global calculator state

Example:

```ts
const [input, setInput] =
  createSignal("");
```

Store owns data.

Components consume data.

---

# services/

External communication layer.

Structure:

```text
services/
│
└── tauri.ts
```

Responsibilities:

* Tauri IPC
* Rust communication

Example:

```ts
import { invoke } from "@tauri-apps/api/core";

export async function evaluate(
  expression: string
) {
  return invoke(
    "evaluate",
    { expression }
  );
}
```

Rule:

Only services should call invoke().

Avoid calling invoke() directly from UI components.

---

# hooks/

Reusable logic.

Structure:

```text
hooks/
│
├── useKeyboard.ts
└── useHistory.ts
```

Responsibilities:

* Shared behavior
* Reusable interactions

Example:

```ts
export function useKeyboard() {
  ...
}
```

Similar to React hooks.

---

# types/

TypeScript types.

Structure:

```text
types/
│
├── calculator.ts
└── history.ts
```

Example:

```ts
export interface HistoryItem {
  expression: string;
  result: string;
}
```

Responsibilities:

* Shared type definitions

No logic should exist here.

---

# lib/

Utility functions.

Structure:

```text
lib/
│
├── format.ts
└── date.ts
```

Example:

```ts
export function formatNumber(
  value: number
) {
  return value.toLocaleString();
}
```

Responsibilities:

* Small helper functions

Avoid application-specific business logic.

---

# Rust Structure

```text
src-tauri/
│
├── Cargo.toml
├── tauri.conf.json
│
└── src/
    │
    ├── main.rs
    ├── lib.rs
    │
    ├── commands/
    ├── calculator/
    ├── storage/
    ├── models/
    └── errors/
```

---

# main.rs

Rust application entry point.

Responsibilities:

* Start Tauri application

Example:

```rust
fn main() {
    calc_lib::run();
}
```

Should remain minimal.

---

# lib.rs

Application configuration.

Responsibilities:

* Register commands
* Configure Tauri

Example:

```rust
tauri::Builder::default()
    .invoke_handler(
        tauri::generate_handler![
            evaluate
        ]
    )
```

Acts as the application's composition root.

---

# commands/

Tauri-facing API.

Structure:

```text
commands/
│
├── calculator.rs
└── history.rs
```

Responsibilities:

* Functions exposed to frontend

Example:

```rust
#[tauri::command]
pub fn evaluate(
    expression: String
) -> Result<String, String> {
    ...
}
```

Rule:

Commands should be thin.

They should delegate work to business logic modules.

---

# calculator/

Core calculator engine.

Structure:

```text
calculator/
│
├── tokenizer.rs
├── parser.rs
├── ast.rs
└── evaluator.rs
```

Responsibilities:

* Expression parsing
* Expression evaluation

Example flow:

```text
Input
 ↓
Tokenizer
 ↓
Parser
 ↓
AST
 ↓
Evaluator
 ↓
Result
```

No Tauri-specific code should exist here.

Pure Rust only.

---

# tokenizer.rs

Converts:

```text
(10+5)*2
```

Into:

```text
[
  "(",
  "10",
  "+",
  "5",
  ")",
  "*",
  "2"
]
```

---

# parser.rs

Converts tokens into an AST.

Example:

```text
      *
     / \
    +   2
   / \
 10   5
```

---

# ast.rs

Defines AST node structures.

Example:

```rust
enum Expr {
    Number(f64),
    Add(Box<Expr>, Box<Expr>),
}
```

Represents mathematical expressions.

---

# evaluator.rs

Executes the AST.

Example:

```text
AST
 ↓
Calculate
 ↓
Result
```

Returns:

```text
30
```

---

# storage/

Persistence layer.

Structure:

```text
storage/
│
└── history_store.rs
```

Responsibilities:

* Save history
* Load history
* Manage files

Example:

```rust
save_history(...)
load_history(...)
```

Any filesystem access belongs here.

---

# models/

Application data structures.

Structure:

```text
models/
│
└── history.rs
```

Example:

```rust
pub struct HistoryItem {
    expression: String,
    result: String,
}
```

Models represent data.

No business logic.

---

# errors/

Custom error types.

Structure:

```text
errors/
│
└── mod.rs
```

Responsibilities:

* Shared error definitions

Example:

```rust
pub enum CalculatorError {
    ParseError,
    InvalidExpression,
}
```

Used throughout the backend.

---

# Data Flow

```text
User
 ↓
Component
 ↓
Store
 ↓
Service
 ↓
invoke()
 ↓
Command
 ↓
Calculator Engine
 ↓
Result
 ↓
Component
 ↓
User
```

---

# Folder Placement Rules

Question:

"Where should this code go?"

UI?

```text
components/
```

Screen?

```text
pages/
```

State?

```text
stores/
```

Rust communication?

```text
services/
```

Tauri command?

```text
commands/
```

Calculator logic?

```text
calculator/
```

File storage?

```text
storage/
```

Data structure?

```text
models/
```

Helper function?

```text
lib/
```

If every file follows these rules, the codebase remains organized even as it grows into a large application.
