---
id: BUG-0004
symptom_layer: Logic
subtype: edge-case
severity: sev2
state: diagnosed
root_cause: "hypothesis under test; three fix attempts will be simulated"
root_cause_layer: Logic
3_strikes_count: 0
verification:
  method: test-run
  capability_tier: FULL
  evidence: ""
  verified_by: ""
hard_lock_violations: []
guard: ""
---

# BUG-0004 — 3-strikes seed (negative, transition-driven)

Starting state for acceptance check #4. The runner applies
`applyTransition(ledger, 'record_fix_failure')` THREE times and asserts:
(a) the counter reaches 3 via the function, and (b) the 3rd application FIRES
`state -> escalated`. A system that never increments or never escalates fails this test —
it cannot pass green-by-construction, because the fixture does not pre-set the count.
