# CLAUDE.md — shipwithai-fixkit-core

The stack-agnostic bug-fix engine. This file is runtime guidance for working inside the plugin.

## Mental model
A bug is a **ledger entry** moving through a state machine. The orchestrator (`commands/fix.md`)
runs the main thread; isolated layer-agents do the fixing; skills supply the discipline. State is
guarded by code (`lib/ledger-validator.js`), not by intent.

## The loop
`intake → triage (Axis A) → reproduce → diagnose (Iron Law) → fix → verify (by layer/tier) →
guard → integrity-close`. Off-ramp: 3 failed fixes or a design-organism root cause → `escalated`.

## Rule codes (shared vocabulary)
`IRON_LAW_FIX_BEFORE_ROOT_CAUSE` · `INTEGRITY_EVIDENCE_EMPTY` · `INTEGRITY_VERIFIER_MISSING` ·
`ASSIST_CANNOT_CLOSE` · `VERIFICATION_LAYER_MISMATCH` · `THREE_STRIKES_NO_ESCALATION`. Cited by both
`commands/fix.md` and the validator.

## Files
- `commands/fix.md` — orchestrator entry.
- `skills/{triage,spine,verification,regression-guard}/SKILL.md` — `spine`/`verification`/
  `regression-guard` are `user-invocable:false` sub-skills; `triage` is user-invocable.
- `agents/{ui,logic,system}-bug-agent.md` — isolated fixers, `model: sonnet`.
- `lib/ledger.schema.md` — the ledger schema; runtime ledgers live in a project's `.fixkit/`.
- `lib/ledger-validator.js` — `validateLedger` (invariants) + `applyTransition` (guards).
- `tests/run-all.js` — the deterministic gate (CI runs it). `evals/fixtures/` holds the ledger
  fixtures + the stub-adapter (test scaffolding, NOT a real adapter).
- `CONNECTORS.md` — `~~category` placeholders + generic defaults.

## Run the gate
`node tests/run-all.js` (from this directory). Exit 0 = Phase-0 gate satisfied.

## Limits (BLOCKING)
SKILL.md < 200 · references < 150 · bundles < 500 · inline code ≤ 20 · description < 200 chars ·
evals ≥ 5 (3 trigger / 2 must-not) · 4-key version sync · ≥ 1 `user-invocable:false` skill ·
every skill/agent ends with `## What this … does NOT do`.

## Seams (not built in Phase 0)
`hard_lock_violations` + the pre-fix hook in step 8 of `fix.md` are where Phase-1 hard-locks plug
in. ASSIST connectors (`~~browser`, real `~~ci`, `~~monitoring`) arrive with the adapters.

## What this plugin does NOT do
- It ships no real adapters and no org-specific hard-locks (Phase 1+).
- It does not close bugs without layer-appropriate evidence and a named verifier.
- It does not compose via `plugin.json` dependency wiring.
