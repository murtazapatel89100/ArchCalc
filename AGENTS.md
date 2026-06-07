# Agent Rules (Root)

This file contains rules for any AI agent interacting with the `ArchCalc` repository.

## General Project Context
- **ArchCalc** is a monorepo containing a Tauri/SolidJS desktop app (`/app`) and a Next.js documentation website (`/web`).
- Always check the `AGENTS.md` files within the subdirectories (`/app/AGENTS.md` and `/web/AGENTS.md`) as they contain framework-specific rules.
- Do not make breaking structural changes to the monorepo setup without explicit user approval.

## Code Standards
- **Commits**: Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) strictly (`feat:`, `fix:`, `docs:`, `chore:` etc.). This repository uses semantic versioning powered by `release-please`.
- **Formatting**: We use [Biome](https://biomejs.dev/) for formatting and linting JavaScript/TypeScript files. Run `pnpm dlx @biomejs/biome check --write ./` after making TS/JS changes.
- **Rust**: We use `cargo fmt` and `cargo clippy`. Ensure zero warnings by running `cargo clippy --workspace --all-targets --all-features -- -D warnings`.

Always favor clarity and maintainability over clever hacks.
