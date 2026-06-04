# kmp-stub-assist — the ASSIST exercise (test scaffolding, NOT a real target)

The fixkit family's **first real ASSIST exercise**. A Compose/SwiftUI layout bug renders on a device
the agent cannot observe (no `~~browser`, no device connector wired), so the engine does **not**
guess and does **not** auto-close. It builds + diagnoses, then emits a `handoff/v0` for a provider
(Cowork, a device farm, a CI snapshot, or a human) to observe.

Files:
- `handoff.json` — the emitted `handoff/v0` for the UI bug (`symptom_layer: UI`, a UI
  `LAYER_METHODS` `assertion.method`, `verified_by: null`). A **valid request**, not a failure.
- `ledger.candidate.json` — a synthetic ASSIST UI ledger stopped at `state: candidate`.
- `assist.test.js` — runs against **core's** `validateHandoff` + `validateLedger` (read-only reuse)
  and asserts the red→green pair: handoff valid + candidate accepted (GREEN); the same ledger forced
  to `closed` refused with `ASSIST_CANNOT_CLOSE` (RED). Exit 0 only if all hold.

Run via `node assist.test.js` exit code; wired into `tests/run-all.js` section 1. The real device
verification (a provider fills `verified_by`, advancing the ledger) is the deferred gate-run.
