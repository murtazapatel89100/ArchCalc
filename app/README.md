# ArchCalc — desktop app

The ArchCalc desktop application: a [Tauri 2](https://tauri.app/) shell with a Rust backend and a [SolidJS](https://www.solidjs.com/) + Tailwind CSS frontend, built with Vite.

Read [ARCHITECTURE.md](ARCHITECTURE.md) for how the code is organised, and the root [CONTRIBUTING.md](../CONTRIBUTING.md) before opening a pull request.

## Prerequisites

[Node.js](https://nodejs.org/) 20+, [pnpm](https://pnpm.io/) 11, the [Rust toolchain](https://rustup.rs/) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.

## Commands

Run from this directory after `pnpm install`:

| Command | What it does |
| :-- | :-- |
| `pnpm tauri dev` | Run the app with hot reload |
| `pnpm tauri build` | Build release bundles (`.deb`, `.rpm`, `.msi`, …) |
| `pnpm dev` | Run only the frontend in a browser (Tauri commands are unavailable) |
| `pnpm build` | Production build of the frontend (Vite) |
| `pnpm test` | Unit tests (Vitest) |
| `pnpm dlx @biomejs/biome check --write ./` | Format and lint the frontend |
| `pnpm showcase` | Record the docs videos, clips and screenshots into `../web/public` (needs `ffmpeg` and `pnpm exec playwright install chromium`) |

Rust, from `src-tauri/`:

| Command | What it does |
| :-- | :-- |
| `cargo test` | Backend unit tests |
| `cargo fmt` | Format |
| `cargo clippy --workspace --all-targets --all-features -- -D warnings` | Lint (CI fails on any warning) |
