---
id: BUG-0104
symptom_layer: UI
subtype: visual/styling
severity: sev3
state: escalated
root_cause: "the --sl-color-tip-* token mapping is an upstream design organism in the DS package"
root_cause_layer: upstream
fix: ""
3_strikes_count: 0
multi_repo: true
fix_source: design-repo
pending_followup: none
verification:
  method: computed-style
  capability_tier: FULL
  evidence: ""
  verified_by: ""
hard_lock_violations: []
guard: ""
---

# BUG-0104 — happy design-repo off-ramp to escalated (positive)

Happy fixture (AC5). `fix_source: design-repo`, `root_cause_layer: upstream`, `state: escalated` —
the correct off-ramp. None of the three new guards fire: `escalated` is not a `POST_ROOTCAUSE_STATE`
and not a consumer post-fix state, and the root_cause_layer matches `upstream`. `validateLedger`
must ACCEPT. A cross-repo-handoff/v0 artifact carries the DS-fix → publish → bump sequence; the
consumer source is not edited.
