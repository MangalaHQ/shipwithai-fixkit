---
name: verification
description: "Enforce the verification matrix: proof is dictated by symptom layer; FULL runs and observes, ASSIST emits handoff/v0. A rendered bug never closes on a source diff."
version: 0.1.0
license: MIT
user-invocable: false
---

# Verification — proof dictated by layer

A fix is not done because it looks right. It is done when the **layer-appropriate proof** has
been produced and recorded. This sub-skill selects that proof and blocks dishonest closes.

## The matrix

| Symptom layer | Reproduction | Proof of fixed | Tooling |
|---|---|---|---|
| **UI** | navigate / interact / resize the running app | live computed-style / DOM / console assertion on the rendered page | `~~browser` |
| **Logic** | a failing automated test | failing test passes + full suite green | `~~test-runner` |
| **System** | reproduce in failing env; instrument boundaries | instrumented boundary logs correct + pipeline green | `~~ci`, shell, `~~monitoring` |

Allowed `verification.method` values per layer are enforced by `lib/ledger-validator.js`
(`LAYER_METHODS`). A method outside the layer's set on a `closed`/`verified` ledger is rejected
with `VERIFICATION_LAYER_MISMATCH`.

## Capability tiers

| Tier | The agent can… | Result | Max ledger state |
|---|---|---|---|
| **FULL** | run AND observe the artifact | run the layer proof | `closed` |
| **ASSIST** | build / diagnose, but not observe the running result | emit `handoff/v0` | `candidate` |
| **NONE** | not build here | bug not accepted by this adapter | — |

## The integrity rule

```
no runner -> no auto-close -> handoff/v0
```

- **FULL:** run the proof, record `verification.evidence` (the assertion output) and
  `verification.verified_by` (the agent/runner), move to `verified`, then the orchestrator
  closes.
- **ASSIST:** do **not** mark closed. Emit a `handoff/v0` describing exactly what a human/CI must
  run to confirm, set `capability_tier: ASSIST`, and stop at `candidate`. The validator rejects
  an ASSIST ledger in `closed` with `ASSIST_CANNOT_CLOSE`.

## Closing requires real proof

The state machine refuses `close` unless **both** hold:

- `verification.evidence` is non-empty (something was actually observed), and
- `verification.verified_by` names who/what observed it.

An empty-evidence close is rejected with `INTEGRITY_EVIDENCE_EMPTY`; a missing verifier with
`INTEGRITY_VERIFIER_MISSING`.

## Rule codes this skill enforces

`VERIFICATION_LAYER_MISMATCH` · `ASSIST_CANNOT_CLOSE` · `INTEGRITY_EVIDENCE_EMPTY` ·
`INTEGRITY_VERIFIER_MISSING`. These are the same codes `commands/fix.md` cites at its gate, so
prose and code share one vocabulary.

## What this does NOT do

- It does not run the proof itself — the layer-agent runs it; this skill says which proof counts.
- It does not classify the bug (see `triage`) or find the root cause (see `spine`).
- It does not leave the regression artifact (see `regression-guard`).
- It does not invent connectors; it references `~~category` placeholders resolved in
  `CONNECTORS.md`.
