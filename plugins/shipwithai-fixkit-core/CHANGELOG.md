# Changelog — shipwithai-fixkit-core

## [0.3.0] — 2026-06-05

### Added
- **Pattern-learning capability** (read-only ledger history mining — the deal-debrief/playbook-monitor
  idiom): `agents/pattern-learning.md` (flat `.md`, read-only tools, never writes a ledger), a
  `user-invocable:false` `skills/pattern-mining/` sub-skill (mine → rank → propose; proposals cite
  source bug IDs), and a zero-dep `lib/pattern-miner.js`.
- **`lib/pattern-miner.js`** — clusters ledgers by a **structural scope token** (a `@scope/package`
  reference or a backtick-quoted identifier) **plus** ≥1 additional shared salient token (K=2,
  injectable), at a tunable frequency threshold (default 2). No curated domain vocabulary in core
  (the optional re-ranking boost's values live in the org pack config profile). Fails **loudly** on a
  malformed ledger (the PR #3 lesson); union-find clustering; ranked candidate report (+ CLI).
- **Parser promotion:** `lib/frontmatter.js` is now the canonical parser (reused by the miner);
  `tests/lib/frontmatter.js` is a re-export shim so the gate's require + parser unit tests are
  unchanged (behavior-preserving — gate stayed green across the move).
- **Gate section 6e (pattern miner)** in `tests/run-all.js` (99 checks, was 78): a recurring pair
  surfaces at threshold; sub-threshold noise and a no-scope-token negative control stay out; a
  malformed ledger throws; mutation checks bite (threshold 2→3 drops the pair; stripping the scope
  token dissolves the cluster); frequency counts **distinct bug ids** (a duplicated/superseded id
  cannot inflate a pattern); the optional boost re-ranks but never changes membership.

### Notes
- Additive + read-only: **no** change to any state-machine guard (`lib/ledger-validator.js`,
  `lib/handoff-validator.js`). The miner only reads ledgers; it never mutates the append-only history.
- Minor bump (new capability). 4-key version sync updated.

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
