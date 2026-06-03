# Project Facts

*Add decisions and facts that Claude should remember across sessions.*

## Key decisions
- Phase 0 ships `shipwithai-fixkit-core` only — the reusable engine. No adapters, no pack, no
  org-specific hard-locks (Phase 1+).
- Deterministic Phase-0 gate (ADR-0004): the ledger state machine is a zero-dep Node module
  (`lib/ledger-validator.js`) with two surfaces — `validateLedger` (invariants) and
  `applyTransition` (the guard the orchestrator calls). Negative tests drive events, not snapshots.
- The vendored spine (`skills/spine/SKILL.md`) is a condensed adaptation of
  `superpowers:systematic-debugging` (MIT © 2025 Jesse Vincent); attribution in `NOTICE`.
- Compose by convention (slash-path + `user-invocable:false` sub-skills + `agents/*.md`); never by
  `plugin.json` dependency wiring.

## Known constraints
- Quality limits are BLOCKING in `tests/run-all.js`: SKILL.md < 200, references < 150, bundles < 500,
  inline code ≤ 20, description < 200 chars, ≥ 5 evals/skill (3 trigger / 2 must-not), 4-key version sync.
- Every skill and agent ends with `## What this … does NOT do`.
- Never modify the validator or the gate without a plan; change them tests-first and mutation-check.
- No remote configured yet — work lives on branch `phase-0/fixkit-core` (commits f5e154a build,
  4cd987f amendment). PR-out awaits Ethan + a GitHub remote.

## Future work
- Phase 1: web adapter + ShipWithAI pack + hard-locks (AD-027 etc.) plug into the `hard_lock_violations`
  seam and the pre-fix hook in `commands/fix.md` step 8.
- `shipwithai-fixkit-focus` gets its own harness during the Phase-1 scaffold.
