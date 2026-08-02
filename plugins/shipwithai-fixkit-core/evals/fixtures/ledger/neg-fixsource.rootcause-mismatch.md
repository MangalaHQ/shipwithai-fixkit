---
id: BUG-0103
symptom_layer: UI
subtype: visual/styling
severity: sev3
state: diagnosed
root_cause: "claimed the token mapping is a consumer Logic bug"
root_cause_layer: Logic
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

# BUG-0103 — design-repo fix_source with a non-upstream root_cause_layer (negative)

Negative fixture for `FIXSOURCE_ROOTCAUSE_MISMATCH`. `fix_source: design-repo` asserts the fix is
owned by the DS package, but `root_cause_layer: Logic` (not `upstream`) contradicts it. The
consistency invariant must REJECT: `fix_source ∈ {design-repo, both} ⇒ root_cause_layer == upstream`.
`hard_lock_violations: []` so only the intended code fires.
