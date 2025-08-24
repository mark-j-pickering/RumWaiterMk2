# Changelog

## v1.2.0 (Baseline)
- Forked from v1.1 clean build
- Requirements spec added to /docs

## v1.2.1
- Bug 18: Still exists, under investigation.
- Bug 24: Reset UP/DOWN state when limit switch trips.
- Bug 25: Force-limit checkboxes auto-uncheck on restart of UP/DOWN.
- Bug 26: JAM button now toggle (click ON, click OFF).

## v1.2.2
- Bug 18: Still exists (Run Time counter issue).
- Bug 24: Limit switch trips now reset UP/DOWN state and block motion when active.
- Bug 25: Force-limit checkboxes auto-clear on new UP/DOWN command.
- Bug 26: JAM control is now a checkbox toggle; engaging stops motion, disengaging allows commands.
- Added status line showing JAM and Motion direction in Live Signals.

## v1.2.3
- Removed Pulse overload (2 s) button from Interlocks section.
- Bug 18 fix attempt: run clock now resumes counting after limit trip when movement restarts.

## v1.2.4
- Bug 18: Trip state cleared when starting new motion, so clock should now continue running after restart.
- Bug 24/25: Added engine shim that sets limitTop/limitBottom when carriage reaches ends of travel; GUI indicators now reflect these states.

## v1.2.5
- Fixed engine-shim.ts: added proper override modifier and re-export of SimEngine to satisfy TypeScript 5.
- Build should now pass without TS2459/TS4114 errors.

## v1.2.6
- Fixed engine-shim.ts: now exports SimEngine as a class so it can be used both as a type and value.
- Resolves TypeScript error TS2749 ('SimEngine' refers to a value, but is being used as a type).


## v1.2.7 → v1.2.13
- Abandoned/failed builds


## 1.3.4a - 2025-08-22
- JAM control converted to a button in Controls panel
