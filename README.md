# RUMWaiter Mk2 — 50 kg SWL Scaffold

This is a **minimal, buildable scaffold** for the simulator and UI with a 50 kg SWL default.  
It uses PNPM workspaces, TypeScript, Vite, and React. Packages are stubbed to compile now and give
you an immediately runnable UI shell that shows the 50 kg preset and a simple simulated lift.

## Quick start
1. Install **Node.js 22.x** (Current) and **PNPM 9.x**.  
   - The project is locked to these versions in `.nvmrc` and `package.json` (`engines` field).  
   - Run `node -v` and `pnpm -v` to confirm. You should see Node v22.x and PNPM v9.x.
2. Clone/extract the repo and `cd simulator`.
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Start the UI in dev mode (fastest for daily use):
   ```bash
   pnpm -F sim-ui dev
   ```
   Open the URL Vite prints (usually http://localhost:5173).

## Development workflows

- **🚀 UI only (fast hot reload):**
  ```bash
  pnpm -F sim-ui dev
  ```
  Runs only the `sim-ui` workspace with Vite. Use this for normal UI development.

- **🔨 Build all workspaces:**
  ```bash
  pnpm -r build
  ```
  Compiles every workspace (`sim-engine`, `devices`, `mcu-emu`, `sim-ui`).  
  Use this to check the whole monorepo builds cleanly (CI/test/release).

- **✅ Full build then run UI:**
  ```bash
  pnpm -r build && pnpm -F sim-ui dev
  ```
  Ensures all dependencies are freshly built before starting the UI.

## Notes
- **SWL** defaults to **50 kg** with soft current trip at **22 A (≥500 ms)** and hard trip at **28 A (≥100 ms)**.
- The MCU emulator and I²C device models are stubs here. The UI is wired to a simple deterministic plant model so you can verify flows now.
- The structure matches the architecture we discussed so we can expand rapidly.

## Workspace
```
apps/
  sim-ui/
packages/
  sim-engine/
  devices/
  mcu-emu/
```
