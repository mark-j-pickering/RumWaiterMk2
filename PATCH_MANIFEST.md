# RUMWaiter Mk2 v1.4-step0 Patch Manifest

This patch introduces the basic Arduino HEX emulator framework:

## New Files
- `packages/mcu-emu/hexLoader.ts`
- `packages/mcu-emu/cpuRunner.ts`
- `apps/sim-ui/src/components/HexLoader.tsx`

## Modified Files
- `packages/mcu-emu/index.ts`

## Integration
- Run the UI and use the new "Arduino HEX Loader" box to upload a `.hex` file.
- Console will log PORTB pin changes (proof of life).
- No motor physics or I2C integration yet.

Next step: expand bridge to connect MCU pins ↔ sim-engine.
