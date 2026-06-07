---
id: BUG-H001
symptom_layer: UI
subtype: layout-overflow
severity: sev2
state: closed
root_cause: "the <pre> used white-space:pre in a fixed 280px box, so a long unwrapped line overflowed its container"
root_cause_layer: UI
fix: "white-space: pre-wrap + overflow-wrap: anywhere on #code (smallest change at the root cause)"
3_strikes_count: 0
verification:
  method: dom-assertion
  capability_tier: FULL
  evidence: "drive.js --measure overflow #code -> {scrollWidth:280, clientWidth:280, overflow:false} (was scrollWidth:612 > clientWidth:280 before the fix); ok:true"
  verified_by: "ui-bug-agent (web-harness/playwright)"
hard_lock_violations: []
guard: "evals/fixtures/smoke-page/fixed.html pins #code scrollWidth <= clientWidth at 1280/768/375"
---

# BUG-H001 — code block overflows its box (contract fixture, VALID)

Cross-plugin contract fixture (Architect R1). This ledger is shaped EXACTLY as the layer-agent
would populate it from `drive.js` output: a UI bug closed at `capability_tier: FULL`, proven on a
UI `LAYER_METHODS` method (`dom-assertion`), with the **observed Playwright numbers** recorded as
`verification.evidence` and a named `verified_by`. The harness gate runs core's `validateLedger`
over this snapshot and asserts it is ACCEPTED — proving the harness→validator contract end-to-end
with zero dependency. Its negative twin (`harness-ui-close.drift-method.md`) must be REJECTED.
