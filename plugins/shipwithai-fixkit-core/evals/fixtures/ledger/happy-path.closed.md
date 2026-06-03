---
id: BUG-0001
symptom_layer: Logic
subtype: wrong-output
severity: sev2
state: closed
root_cause: "sum() seeded the accumulator at 1 instead of 0 (off-by-one), inflating every total by 1"
root_cause_layer: Logic
3_strikes_count: 0
verification:
  method: test-run
  capability_tier: FULL
  evidence: "node evals/fixtures/stub-adapter/verify.test.js -> 'sum([1,2,3]) === 6' passes (2/2, exit 0); reproduce.test.js fails on buggy.js (exit 1) before the fix"
  verified_by: logic-bug-agent
hard_lock_violations: []
guard: "evals/fixtures/stub-adapter/verify.test.js (regression test pins sum([1,2,3]) === 6)"
---

# BUG-0001 — totals are always 1 too high

Happy-path fixture: a synthetic Logic bug driven through the full lifecycle against the
stub local adapter. The runner actually executes the reproduce -> verify steps, then
`validateLedger` ACCEPTS this snapshot (Phase-0 acceptance check #1).

## Reproduce
`node reproduce.test.js` fails against `buggy.js`: expected `sum([1,2,3]) === 6`, received `7`
(exit 1).

## Isolate / Diagnose
Traced the bad value to `sum()` in `buggy.js`: the accumulator starts at `1` (off-by-one).
Root cause is in the Logic layer (Axis B == Axis A).

## Fix
Smallest change at the root cause: seed the accumulator at `0` (`fixed.js`).

## Verify
Ran the test runner (`~~test-runner`, FULL capability): `node verify.test.js` against `fixed.js`
passes (2/2, exit 0). Evidence + verifier recorded above.

## Guard
`verify.test.js` is kept as the regression guard (it pins `sum([1,2,3]) === 6`).
