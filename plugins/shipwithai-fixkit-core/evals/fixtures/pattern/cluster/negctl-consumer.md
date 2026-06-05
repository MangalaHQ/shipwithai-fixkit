---
id: BUG-9004
symptom_layer: UI
subtype: layout/overflow
severity: sev3
state: verified
root_cause: "A code snippet rendered outside the main body lacked the overflow rule; it is a consumer-local component, fixed with a scoped style in the consumer."
root_cause_layer: UI
fix: "Add a scoped overflow rule in the consumer component."
3_strikes_count: 0
verification:
  method: computed-style
  capability_tier: ASSIST
  evidence: "synthetic"
  verified_by: "fixture"
hard_lock_violations: []
guard: "synthetic fixture — negative control: no package ref, no backtick id -> no scope token"
---

# BUG-9004 — synthetic negative control (consumer-local)
Synthetic ledger whose root_cause has NO package reference and NO backtick-quoted identifier, so it
yields no structural scope token and can never join a cluster — mirrors the real BUG-003 control.
