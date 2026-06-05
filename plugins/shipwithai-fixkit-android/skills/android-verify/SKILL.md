---
name: android-verify
description: "Android verify recipes: Logic = failing test passes + suite green; UI (ASSIST) = emit handoff/v0 with a UI LAYER_METHODS proof, ledger stops at candidate. Internal: engine verify step."
version: 0.1.0
license: MIT
user-invocable: false
---

# android-verify — prove the fix by re-running the reproduction

The Android adapter's verify recipes. **Verification mirrors reproduction:** each recipe re-runs the
*same observation* `android-reproduce` used to trigger the failure — same test, same build — now
asserting the fixed result. A bug reproduced by a failing JVM test is verified by that test passing,
**never by a source diff** (core enforces `VERIFICATION_LAYER_MISMATCH`).

Proof methods MUST match the layer's `LAYER_METHODS`: Logic = `test-run` / `failing-test-passes` /
`unit-test`; System = `instrumented-boundary` / `pipeline-run` / `ci-run` / `integration-test`; UI =
`browser-assertion` / `computed-style` / `dom-assertion` / `console-assertion` / `interaction-assertion`.

## Logic — the failing test passes + suite green (mirrors reproduce-by-test)
Re-run the previously-failing host-JVM unit test; assert it now passes, then run the **full suite** to
catch regressions. Record the suite result as `verification.evidence`. Method: `failing-test-passes`.

```bash
./gradlew testDebugUnitTest   # the previously-failing test now passes; the suite is green
```

## System — Gradle build / pipeline green (mirrors the build reproduction)
Re-run `./gradlew build` (or the CI job); assert the build is now green and the boundary/config record
is correct. Record the build/pipeline result as `verification.evidence`. Method: `pipeline-run` /
`ci-run`.

## UI (ASSIST) — emit handoff/v0 (no device → do NOT auto-close)
UI has no device/`~~browser` connector, so the layer is **ASSIST**: do **not** auto-close. Emit a
`handoff/v0` (core `lib/handoff.schema.md`) so a provider who *can* observe runs the proof. Set the
target device/viewport, the mirrored steps, and a UI-`LAYER_METHODS` assertion by symptom subtype;
leave `verified_by: null`. The ledger stops at `candidate` until a provider fills it.

| Symptom subtype | UI method (reused from core) |
|---|---|
| layout / clipping / overflow / safe-area | `computed-style` |
| tap / gesture / navigation / state-change | `interaction-assertion` |
| logcat / crash-log output | `console-assertion` |

```json
{
  "version": "handoff/v0", "bug_id": "BUG-XXXX", "symptom_layer": "UI",
  "target": { "env": "device", "device": "Pixel 8 / API 35", "viewport": "1080x2400" },
  "steps": ["install the debug APK", "open the screen", "rotate to landscape", "observe the last row"],
  "assertion": { "method": "computed-style", "expected": "last row clears the bottom bar (no overlap)" },
  "verified_by": null
}
```

## What this skill does NOT do
- It does not fix the bug or run the proof itself — the layer-agent does; this names the proof.
- It does not close the ledger (core's integrity rule does) or weaken the ASSIST ceiling.
- It does not invent a proof method outside the layer's `LAYER_METHODS`, and never closes on a diff.
