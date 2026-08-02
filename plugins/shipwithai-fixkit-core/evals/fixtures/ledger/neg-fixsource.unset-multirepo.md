---
id: BUG-0101
symptom_layer: UI
subtype: visual/styling
severity: sev3
state: fixed
root_cause: "the --sl-color-tip-* token mapping drifts from the DS dark-mode palette"
root_cause_layer: upstream
fix: ""
3_strikes_count: 0
multi_repo: true
fix_source: ""
pending_followup: none
verification:
  method: computed-style
  capability_tier: FULL
  evidence: ""
  verified_by: ""
hard_lock_violations: []
guard: ""
---

# BUG-0101 — multi-repo ledger reached a post-root-cause state without fix_source (negative)

Negative fixture for `FIX_SOURCE_UNSET_MULTIREPO`. `multi_repo: true` but `fix_source` is empty,
yet the ledger sits at `fixed` (a `POST_ROOTCAUSE_STATE`). The invariant auditor must REJECT: a
multi-repo bug cannot enter a post-root-cause state without first classifying which repo owns the
fix. `hard_lock_violations: []` so only the intended code fires.
