# Changelog — shipwithai-fixkit-core

## [0.2.0] — 2026-06-04

### Added
- **`handoff/v0`** (`lib/handoff.schema.md` + `lib/handoff-validator.js`): the minimal, versioned
  verification handoff the engine emits on an ASSIST layer (build/diagnose possible, observe not).
  Fields: `version, bug_id, symptom_layer, target{env,url,device,viewport}, steps[],
  assertion{method,expected}, verified_by`. `validateHandoff` enforces the same layer-proof binding
  as the ledger close-path (`HANDOFF_LAYER_MISMATCH` mirrors `VERIFICATION_LAYER_MISMATCH`). Defined
  now so P3/P4 inherit one format.
- **Hard-lock pre-fix guard** (`HARD_LOCK_VIOLATION`): a shared `hardLockViolation` helper refuses
  `enter_fixed`/`enter_candidate` (pre-fix) and, defense-in-depth, `enter_verified`/`close`;
  `validateLedger` flags any post-fix state while `hard_lock_violations` is non-empty. Fills the
  Phase-0 `hard_lock_violations` seam so org packs can block a fix pre-fix.
- **Gate sections 6c (hard-lock) and 6d (handoff/v0)** in `tests/run-all.js` (78 checks, was 67),
  including the layer-binding rejection and control-pair transition guards (manual-mutation confirmed).

### Notes
- Trust-anchor change (`lib/ledger-validator.js`) done tests-first + mutation-checked; no existing
  guard weakened. The `hard_lock_violations` field was already parsed in Phase 0 (seam, now filled).

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
