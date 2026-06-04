---
name: backend-verify
description: "Backend verify recipes mirroring reproduce: Logic = failing test passes + suite green; System = boundary logs correct + pipeline green. Never closes on a diff. Internal: engine verify step."
version: 0.1.0
license: MIT
user-invocable: false
---

# backend-verify — prove the fix by re-running the reproduction

The backend adapter's verify recipes. **Verification mirrors reproduction:** each recipe re-runs the
*same observation* `backend-reproduce` used to trigger the failure — same test, same boundary — now
asserting the fixed result. A bug reproduced by a failing test is verified by that test passing;
a boundary bug is verified by the boundary log, **never by a source diff** (core enforces
`VERIFICATION_LAYER_MISMATCH`).

Proof methods MUST match the layer's `LAYER_METHODS`: Logic = `test-run` / `failing-test-passes` /
`unit-test`; System = `instrumented-boundary` / `pipeline-run` / `ci-run` / `integration-test`.

## Logic — the failing test passes + suite green (mirrors reproduce-by-test)
Re-run the previously-failing test; assert it now passes, then run the **full suite** to catch
regressions. Record the suite result as `verification.evidence`. Method: `failing-test-passes`.

```bash
npm test            # the previously-failing test now passes; whole suite green
```

## System — boundary logs correct + pipeline green (mirrors instrumented boundary)
Re-run the instrumented boundary; assert the record now carries the correct value, and the pipeline
(`~~ci`) is green. Record the boundary log line as `verification.evidence`. Method:
`instrumented-boundary` (or `pipeline-run` / `ci-run`).

```js
const log = [];
handleAtBoundary({ method: 'GET', path: '/api/x/' }, log);
console.assert(log[0].normalizedPath === '/api/x', 'boundary fixed');
```

## UI — refused (capability NONE)
This adapter does not verify UI bugs (UI = NONE). It never emits a UI proof; UI bugs are re-routed
at triage to a UI-capable adapter.

## What this skill does NOT do
- It does not fix the bug or run the proof itself — the layer-agent does; this names the proof.
- It does not close the ledger (core's integrity rule does) and never closes on a source diff.
- It does not invent a proof method outside the layer's `LAYER_METHODS`, and does not verify UI.
