# ArchCalc Desktop App

This directory contains the core desktop application for ArchCalc, built using [Tauri](https://tauri.app/), [SolidJS](https://www.solidjs.com/), and Rust.

## Architecture

Please read [ARCHITECTURE.md](ARCHITECTURE.md) for an in-depth explanation of the Rust backend structure, IPC bridge, and SolidJS frontend.

## Development Setup

### Prerequisites
Ensure you have the Rust toolchain, Node.js, and pnpm installed.

### Commands

- **Start Dev Server**: `pnpm tauri dev`
- **Build App**: `pnpm tauri build`
- **Format UI**: `pnpm dlx @biomejs/biome check --write ./`
- **Lint Rust**: `cargo clippy --workspace --all-targets --all-features`

## Contributing
See the root [CONTRIBUTING.md](../CONTRIBUTING.md) for overall guidelines.
