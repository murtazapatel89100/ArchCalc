## Description

What does this change and why? Link the issue it fixes, if any.

Fixes # (issue number)

## Type of change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (existing behaviour or saved data changes)
- [ ] Documentation only

## Screenshots / recordings

For UI changes, before and after.

## Checklist

- [ ] The title follows Conventional Commits (`feat:`, `fix:`, `docs:`, …)
- [ ] `pnpm dlx @biomejs/biome check ./` passes (app and/or web)
- [ ] `cargo fmt -- --check` and `cargo clippy --workspace --all-targets --all-features -- -D warnings` pass (if Rust changed)
- [ ] Tests added or updated, and `pnpm test` / `cargo test` pass
- [ ] Docs in `web/content/docs` updated if users will notice the change
- [ ] Saved data from older versions still loads (if data formats changed)
