---
id: BUG-0102
symptom_layer: UI
subtype: visual/styling
severity: sev3
state: fixed
root_cause: "the --sl-color-tip-* token mapping lives in the DS package, not the consumer"
root_cause_layer: upstream
fix: "edited starlight-overrides.css in the consumer (WRONG repo)"
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

# BUG-0102 — design-repo fix_source entered a consumer post-fix state (negative)

Negative fixture for `CROSS_REPO_CONSUMER_EDIT`. `fix_source: design-repo` (root cause owned by the
DS package) yet the ledger sits at `fixed` — a consumer post-fix state. The invariant twin must
REJECT: a `design-repo`/`both` bug must `escalate` and emit a cross-repo handoff, never enter
`fixed`/`candidate` in the consumer. `hard_lock_violations: []` so only the intended code fires.
