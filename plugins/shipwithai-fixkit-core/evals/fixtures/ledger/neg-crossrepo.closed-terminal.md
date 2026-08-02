---
id: BUG-0104
symptom_layer: Logic
subtype: wrong-output
severity: sev3
state: closed
root_cause: "the mapping lives in the DS package, not the consumer — owns the fix upstream"
root_cause_layer: upstream
fix: "hand-authored a consumer-side change and marked it closed (WRONG — should have escalated)"
3_strikes_count: 0
multi_repo: true
fix_source: design-repo
pending_followup: none
verification:
  method: test-run
  capability_tier: FULL
  evidence: "fabricated: a consumer test was made to pass, masking the upstream root cause"
  verified_by: logic-bug-agent
hard_lock_violations: []
guard: "n/a"
---

# BUG-0104 — design-repo bug frozen at a CLEAN closed terminal (must be REJECTED)

Negative fixture for the `CROSS_REPO_CONSUMER_EDIT` invariant scope (post-review finding #1).

A hand-authored / corrupted snapshot: `multi_repo: true`, `fix_source: design-repo`,
`root_cause_layer: upstream`, but frozen at `state: closed` with evidence + a named verifier so
every OTHER guard is satisfied. The design intent says a `design-repo`/`both` bug must escalate to
the DS repo and emit a cross-repo handoff — it must NEVER present a clean `verified`/`closed`
terminal in the consumer.

Before the scope fix, guard (3) only checked `['fixed','candidate']`, so `validateLedger` ACCEPTED
this snapshot — a false clean terminal. After widening the invariant to `POST_ROOTCAUSE_STATES`,
`validateLedger` REJECTS it with `CROSS_REPO_CONSUMER_EDIT`. The transition machine already blocks
reaching this state at runtime; this fixture pins the *static auditor* to the same contract.
