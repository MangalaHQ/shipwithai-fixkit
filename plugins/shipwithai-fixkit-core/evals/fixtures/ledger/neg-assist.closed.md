---
id: BUG-0005
symptom_layer: UI
subtype: interaction
severity: sev3
state: closed
root_cause: "missing client:* hydration directive on the reactions component"
root_cause_layer: UI
3_strikes_count: 0
verification:
  method: browser-assertion
  capability_tier: ASSIST
  evidence: "built the fix; cannot run the rendered app here"
  verified_by: ui-bug-agent
hard_lock_violations: []
guard: ""
---

# BUG-0005 — ASSIST tier illegally closed (negative fixture)

The adapter is ASSIST for this layer (it can build/diagnose but not observe the running
result). It therefore may reach `candidate` (handoff/v0) at most — never `closed`.
`validateLedger` MUST REJECT this with `ASSIST_CANNOT_CLOSE`. Encodes the integrity rule:
no runner -> no auto-close -> handoff/v0.
