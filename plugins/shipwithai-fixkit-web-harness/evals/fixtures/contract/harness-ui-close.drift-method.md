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
  method: dom_assertion
  capability_tier: FULL
  evidence: "drive.js --measure overflow #code -> {scrollWidth:280, clientWidth:280, overflow:false}; ok:true"
  verified_by: "ui-bug-agent (web-harness/playwright)"
hard_lock_violations: []
guard: "evals/fixtures/smoke-page/fixed.html pins #code scrollWidth <= clientWidth"
---

# BUG-H001 — drifted method (contract fixture, NEGATIVE — must be REJECTED)

Identical to the valid twin EXCEPT `verification.method` is `dom_assertion` (underscore) instead of
the canonical `dom-assertion` (hyphen). This is the single most likely real-world defect: a method
string that drifts from core's `LAYER_METHODS.UI`. The harness gate asserts core's `validateLedger`
REJECTS this snapshot with `VERIFICATION_LAYER_MISMATCH` — so a string typo can never silently close
a UI bug. This is the guard the cross-plugin contract test exists to bite.
