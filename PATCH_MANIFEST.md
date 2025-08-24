# PATCH_MANIFEST.md — Full clean snapshot (v1.1)

Code word: CRATE
Generated: 2025-08-12T09:24:07

This archive is a full snapshot of the current project state.

Changed/Added
- (entire repository)

DELETE THESE IF PRESENT (only if you hit stale builds)
- packages/*/dist/        (build outputs)
- packages/*/*.tsbuildinfo
- apps/*/dist/

Post-apply
```
pnpm install
pnpm -r build && pnpm -w dev
```
