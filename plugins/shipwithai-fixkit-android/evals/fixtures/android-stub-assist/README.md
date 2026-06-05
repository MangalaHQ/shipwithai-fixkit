# android-stub-assist — the ASSIST UI exercise (device handoff)

A Compose/View UI bug the agent **cannot observe** (no device/`~~browser` connector wired), so the
layer is **ASSIST**. There is no failing→passing test; the correct outcome is a *valid handoff* + a
ledger that stops at `candidate` and **refuses to close**.

- `handoff.json` — an emitted `handoff/v0` for the bug: `symptom_layer: UI`, a device `target`
  (Pixel 8 / API 35), ordered `steps`, a UI `LAYER_METHODS` `assertion` (`computed-style`) with an
  `expected` observable, and `verified_by: null`. A valid *request*, not a failure.
- `ledger.candidate.json` — a synthetic ASSIST UI ledger at `candidate` (`capability_tier: ASSIST`,
  `root_cause` + `fix` filled, evidence/verified_by still empty).
- `assist.test.js` — reuses **core's** `validateHandoff` + `validateLedger` (read-only) and asserts:
  handoff valid + candidate accepted + forced-`closed` refused with `ASSIST_CANNOT_CLOSE`.

This encodes the phase headline: **no recorded `verified_by` → no `closed`.** A provider (Cowork, a
device farm, a human following the protocol) observes the result on a real device, records evidence,
and fills `verified_by` — only then may the ledger advance. The real Android UI bug is the deferred
gate-run (needs a target).
