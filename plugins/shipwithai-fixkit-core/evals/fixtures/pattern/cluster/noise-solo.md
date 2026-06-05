---
id: BUG-9003
symptom_layer: Logic
subtype: state/race
severity: sev2
state: verified
root_cause: "A debounce in the @solo/scheduler queue dropped the trailing invocation under burst load."
root_cause_layer: Logic
fix: "Flush the trailing call on queue drain."
3_strikes_count: 0
verification:
  method: test-run
  capability_tier: FULL
  evidence: "synthetic"
  verified_by: "fixture"
hard_lock_violations: []
guard: "synthetic fixture — unique-signature noise (singleton, below threshold)"
---

# BUG-9003 — synthetic unique-signature noise
Synthetic ledger with a unique scope token `@solo/scheduler`; it shares no scope token with any
other fixture, so it forms a singleton and must NOT surface at threshold 2.
