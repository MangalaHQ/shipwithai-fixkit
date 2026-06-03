---
id: BUG-0002
symptom_layer: Logic
subtype: wrong-output
severity: sev2
state: closed
root_cause: "same off-by-one as BUG-0001"
root_cause_layer: Logic
3_strikes_count: 0
verification:
  method: test-run
  capability_tier: FULL
  evidence: ""
  verified_by: logic-bug-agent
hard_lock_violations: []
guard: ""
---

# BUG-0002 — forced close with NO evidence (negative fixture)

This ledger illegally claims `state: closed` while `verification.evidence` is empty.
`validateLedger` MUST REJECT it with `INTEGRITY_EVIDENCE_EMPTY`
(Phase-0 acceptance check #2 — fails-as-expected). A green run proves the integrity
guard bites: you cannot close a bug you never proved fixed.
