# PATCH_MANIFEST.md — sim-ui TS1109 hotfix

Generated: 2025-08-12T09:20:10

**Changed/Added**
- apps/sim-ui/src/App.tsx  (removed stray `if () engineRef.current?.setOverloadActive(true, 2.5)` lines)

**DELETE THESE IF PRESENT**
- (none)

**Post-apply**
```
pnpm -r build && pnpm -w dev
```
