---
id: BUG-9002
symptom_layer: UI
subtype: interaction/contract
severity: sev3
state: verified
root_cause: "The @acme/widgets Carousel organism resolves its autoplay timer against the wrong slide — an assumption baked into the organism, not the consumer."
root_cause_layer: UI
fix: "Consumer wrapper passes an explicit active-slide index so the organism stops guessing."
3_strikes_count: 0
verification:
  method: interaction-assertion
  capability_tier: ASSIST
  evidence: "synthetic"
  verified_by: "fixture"
hard_lock_violations: []
guard: "synthetic fixture — recurring scope-token member B"
---

# BUG-9002 — synthetic recurring member B
Synthetic ledger. Shares scope token `@acme/widgets` + salient "carousel"/"organism" with BUG-9001.
