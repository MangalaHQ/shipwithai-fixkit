# Changelog — shipwithai-fixkit-core

## [0.1.0] — 2026-06-03

### Added
- **Orchestrator** `commands/fix.md` — main-thread intake → classify → dispatch → gate → verify →
  integrity-close, with 3-strikes tracking.
- **Skills:** `triage` (Axis-A classifier, user-invocable), and `user-invocable:false` sub-skills
  `spine` (vendored systematic-debugging), `verification` (proof-by-layer matrix), and
  `regression-guard` (guard artifacts).
- **Agents:** `ui-bug-agent`, `logic-bug-agent`, `system-bug-agent` (isolated, `model: sonnet`).
- **Ledger:** `lib/ledger.schema.md` (YAML schema + lifecycle) and `lib/ledger-validator.js`, a
  zero-dependency state machine with `validateLedger` (invariants) and `applyTransition` (guards).
- **Deterministic gate:** `tests/run-all.js` + `tests/lib/frontmatter.js`, driving committed
  fixtures under `evals/fixtures/ledger/` and the `stub-adapter` synthetic Logic bug. Enforces the
  4 acceptance checks, the ASSIST/layer-proof honesty invariants, and the blocking linters.
- **Connectors:** `CONNECTORS.md` with `~~category` placeholders + generic defaults.
- **Evals:** ≥5 per skill (3 trigger / 2 must-not-trigger).

### Notes
- The `spine` skill is a condensed adaptation of `superpowers:systematic-debugging`
  (MIT © 2025 Jesse Vincent) — see the repo `NOTICE`.
- No adapters, pack, or hard-locks in this release (Phase 1+). Seams are wired, not filled.
