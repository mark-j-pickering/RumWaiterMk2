# PATCH_MANIFEST.md — sim-engine type fix (limit flags)

Changed/Added
- packages/sim-engine/tsconfig.json
- packages/sim-engine/src/index.ts

DELETE THESE IF PRESENT
- packages/sim-engine/tsconfig.tsbuildinfo
- packages/sim-engine/dist (entire folder)

Post-apply
```
pnpm -r build && pnpm -w dev
```
