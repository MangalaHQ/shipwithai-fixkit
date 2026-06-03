---
id: BUG-0006
symptom_layer: UI
subtype: layout
severity: sev3
state: closed
root_cause: "pre overflow rule missing; code block scrolls horizontally"
root_cause_layer: UI
3_strikes_count: 0
verification:
  method: source-diff
  capability_tier: FULL
  evidence: "changed the CSS; here is the git diff"
  verified_by: ui-bug-agent
hard_lock_violations: []
guard: ""
---

# BUG-0006 — UI bug closed on a source diff (negative fixture)

A rendered (UI) bug can never close on a source diff — proof must be a live computed-style /
DOM / console assertion. This ledger tries to close a UI bug with `method: source-diff`.
`validateLedger` MUST REJECT it with `VERIFICATION_LAYER_MISMATCH` (verification dictated by
layer, arch §7).
