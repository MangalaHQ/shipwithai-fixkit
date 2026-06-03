---
id: BUG-0003
symptom_layer: Logic
subtype: wrong-output
severity: sev2
state: diagnosed
root_cause: ""
root_cause_layer: ""
3_strikes_count: 0
verification:
  method: test-run
  capability_tier: FULL
  evidence: ""
  verified_by: ""
hard_lock_violations: []
guard: ""
---

# BUG-0003 — Iron-Law seed (negative, transition-driven)

Starting state for acceptance check #3. The ledger is `diagnosed` but `root_cause` is
still empty. The runner calls `applyTransition(ledger, 'enter_fixed')` and asserts the
transition is REFUSED with `IRON_LAW_FIX_BEFORE_ROOT_CAUSE` — FIX is unreachable without
a root cause. This tests the GATE (the attempted transition), not a static end-state.
