# Contributing to ArchCalc

First off, thank you for considering contributing to ArchCalc. It's people like you that make ArchCalc such a great tool.

## Development Workflow

1. **Fork & Clone:** Fork the repo and clone it locally.
2. **Install Dependencies:** Run `pnpm install` in the respective directories (`/app` or `/web`).
3. **Branching:** Create a new branch for your feature or bug fix.
4. **Testing:** Ensure all local checks pass.
    - Web: `pnpm dlx @biomejs/biome check ./`
    - App (TS): `pnpm dlx @biomejs/biome check ./`
    - App (Rust): `cargo clippy --workspace --all-targets --all-features -- -D warnings`
5. **Commit:** We use **Conventional Commits**. Please format your commit messages accordingly (e.g., `feat: added new hash tool`, `fix: memory leak in monitor`). This is required for our automated semantic versioning pipeline.
6. **Push & PR:** Push to your fork and submit a Pull Request.
7. **CI Checks:** Once your PR is submitted, our automated GitHub Actions workflow will check your code for formatting and linting rules. **All checks must pass before the PR can be merged.**
## Reporting Bugs
Please use the `Bug Report` issue template and provide as much detail as possible, including OS, hardware metrics (if relevant), and steps to reproduce.

## Suggesting Enhancements
Use the `Feature Request` issue template. Explain *why* the enhancement would be useful to the broader community.
