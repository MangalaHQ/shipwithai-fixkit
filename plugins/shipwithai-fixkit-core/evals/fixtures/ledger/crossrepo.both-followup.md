---
id: BUG-0105
symptom_layer: UI
subtype: visual/styling
severity: sev3
state: escalated
root_cause: "the token mapping must be fixed in the DS package, then the consumer dep bumped"
root_cause_layer: upstream
fix: ""
3_strikes_count: 0
multi_repo: true
fix_source: both
pending_followup: consumer
verification:
  method: computed-style
  capability_tier: FULL
  evidence: ""
  verified_by: ""
hard_lock_violations: []
guard: ""
---

# BUG-0105 — happy `both` off-ramp keeps the consumer half alive (positive)

Happy fixture (AC4). `fix_source: both`, `root_cause_layer: upstream`, `state: escalated`, and
`pending_followup: consumer`. The DS half is `escalated`; `pending_followup: consumer` records the
consumer debt so the ledger does NOT report a clean terminal — the consumer follow-up (bump the DS
dep after publish) is still owed. `validateLedger` must ACCEPT: none of the three guards fire and
the `both`-half tracking survives validation.
