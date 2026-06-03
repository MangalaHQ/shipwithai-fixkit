# CODEMAP — shipwithai-fixkit-core

Navigation guide for the engine plugin. Paths are relative to
`plugins/shipwithai-fixkit-core/`.

## Where things live

| I want to… | Go to |
|---|---|
| Understand the bug loop end-to-end | `commands/fix.md` (the 11-step orchestrator) |
| See how a bug is classified | `skills/triage/SKILL.md` (Axis-A: UI / Logic / System) |
| See the debugging discipline | `skills/spine/SKILL.md` (REPRODUCE→ISOLATE→DIAGNOSE→FIX→VERIFY→GUARD, Iron Law, 3-strikes) |
| See what proof closes a bug | `skills/verification/SKILL.md` (proof-by-layer matrix, FULL vs ASSIST) |
| See the post-fix guard rule | `skills/regression-guard/SKILL.md` |
| Read/modify the state machine | `lib/ledger-validator.js` — `validateLedger(snapshot)` + `applyTransition(ledger, event)` |
| Read the ledger schema | `lib/ledger.schema.md` (fields, lifecycle, transition guards) |
| Run / extend the gate | `tests/run-all.js` (sections 1–7) + `tests/lib/frontmatter.js` |
| See the negative tests | `evals/fixtures/ledger/*.md` (happy-path + 5 negatives) |
| See the runnable happy-path bug | `evals/fixtures/stub-adapter/` (buggy.js → reproduce.test.js fails; fixed.js → verify.test.js passes) |
| Map a placeholder to a tool | `CONNECTORS.md` (`~~runtime`, `~~test-runner`, `~~browser`, …) |

## The rule-code vocabulary (shared by `fix.md` and `ledger-validator.js`)

| Code | Fires when |
|---|---|
| `IRON_LAW_FIX_BEFORE_ROOT_CAUSE` | entering fixed/verified/closed without a `root_cause` |
| `FIX_NOT_RECORDED` | verified/closed without a `fix` (what was applied) |
| `INTEGRITY_EVIDENCE_EMPTY` / `INTEGRITY_VERIFIER_MISSING` | closing without evidence / a named verifier |
| `ASSIST_CANNOT_CLOSE` | an ASSIST-tier bug tries to reach `closed` (max `candidate`) |
| `VERIFICATION_LAYER_MISMATCH` | proof method does not match the symptom layer (e.g. UI on a source diff) |
| `THREE_STRIKES_NO_ESCALATION` | `3_strikes_count >= 3` but state is not `escalated` |
| `UNKNOWN_LAYER` / `UNKNOWN_STATE` | out-of-enum symptom_layer / state |

## Two surfaces, one rule set

- `validateLedger(snapshot)` — audits a frozen ledger against the **invariants** (used for
  acceptance check #2 + the honesty invariants + auditing committed `.fixkit/` ledgers).
- `applyTransition(ledger, event)` — the **guard** the orchestrator calls before mutating state
  (Iron-Law gate, 3-strikes firing, close guards). The negative tests drive *events*, not snapshots.

## Run it

```
cd plugins/shipwithai-fixkit-core
node tests/run-all.js        # exit 0 = gate green (67 checks)
```
