# Agent Rules (App Directory)

This directory contains the Tauri + SolidJS desktop application.

## Framework Rules
1. **SolidJS**: We use SolidJS, NOT React. Do not use React hooks (`useState`, `useEffect`). Use Solid primitives (`createSignal`, `createEffect`, `createMemo`).
2. **Tauri IPC**: All interactions between the frontend and the system must happen via the Tauri IPC (`invoke`).
3. **Rust**: Rust backend code lives in `src-tauri`. Strict clipping rules apply (`cargo clippy -D warnings`). Handle `Result` explicitly. Do not `unwrap()` without justification.

See root `AGENTS.md` for general rules.
