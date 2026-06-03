# CLAUDE.md — shipwithai-fixkit

Runtime guidance for this repo. Conforms to `../shipwithai-plugins` conventions (ADR-0001).
Upstream design SOT: `../shipwithai-fixkit-design/`.

## Project identity
The public, stack-agnostic **bug-fix engine** of the fixkit family (MIT). Phase 0 ships
**`shipwithai-fixkit-core`** only — no adapters, no pack, no org-specific hard-locks.

## Tech stack
- A Claude Code plugin monorepo: Markdown (skills, agents, docs) + JSON (plugin/manifest/marketplace,
  evals) + a thin **zero-dependency Node** trust anchor (the ledger validator + its tests).
- No build, no package manager. Test runner: `node tests/run-all.js` (the deterministic gate).
  Safety hooks: Python 3 standard library only.

## Architecture overview
- Layering: **Commands → Skills → References/Assets**. No upward imports.
- The **ledger is the single source of truth** for bug state; its guards live in
  `plugins/shipwithai-fixkit-core/lib/ledger-validator.js` (`validateLedger` + `applyTransition`).
  `commands/fix.md` cites the same rule-codes.
- Engine loop: `triage` (Axis-A) → `spine` (REPRODUCE→ISOLATE→DIAGNOSE→FIX→VERIFY→GUARD) →
  `verification` (proof by layer) → `regression-guard`. Three layer-agents (UI/Logic/System) run
  in isolated context.

## Key conventions
- Compose by **convention**, never by `plugin.json` dependency wiring: slash-path references +
  `user-invocable:false` sub-skills + `agents/*.md`.
- Every skill and agent ends with `## What this … does NOT do`.
- **Quality limits (BLOCKING in `tests/run-all.js`):** `SKILL.md` < 200 lines; references < 150;
  bundles < 500; inline code blocks ≤ 20 lines; skill `description` < 200 chars; ≥ 5 evals per skill
  (≥ 3 trigger / ≥ 2 must-not-trigger, `shouldTrigger` boolean); ≥ 1 `user-invocable:false` sub-skill.
- **Versioning:** SemVer in `plugin.json` is the source of truth; mirror into both marketplace files.
  4-key sync: `plugin.json` == per-plugin `marketplace.json` (top-level **and** `plugins[0]`) == root
  `marketplace.json` entry. A bump on `plugins/**/.claude-plugin/plugin.json` on `main` triggers
  `publish-plugin.yml`.

## What Claude should know before touching code
- **Vendored spine:** `skills/spine/SKILL.md` is a condensed adaptation of
  `superpowers:systematic-debugging` (MIT © 2025 Jesse Vincent). Keep the license header + the
  top-level `NOTICE` in sync if you refresh it from upstream.
- **Trust anchor:** `lib/ledger-validator.js` + `tests/run-all.js` are the deterministic gate —
  change them tests-first and never weaken a guard without a replacement.
- **Phase boundaries:** adapters, the pack, hard-locks (AD-027 etc.), real `~~browser`/`~~ci`/
  `~~monitoring` connectors, and the three live `shipwithai.io` bugs are **Phase 1+**. Do not build
  them in core; only wire the seams (`hard_lock_violations`, the pre-fix hook, shared rule-codes).

## Workflow
The product is the fix loop (`/shipwithai-fixkit-core:fix`): a bug becomes a ledger entry under
`.fixkit/` and moves through the state machine, closing only on layer-appropriate proof. Repo work:
plan → implement → run the gate → review.

## Commands
- Run the Phase-0 gate: `cd plugins/shipwithai-fixkit-core && node tests/run-all.js` (exit 0 = green).
- The stub fixture's lifecycle: `node …/stub-adapter/reproduce.test.js` (fails on `buggy.js`) then
  `node …/stub-adapter/verify.test.js` (passes on `fixed.js`).

## Development workflow
- **Plan-before-code** (ADR-0002): non-trivial work needs an approved PLAN; HALT for approval.
- **Tests-first for guard changes:** any change to `lib/ledger-validator.js` or the gate writes/updates
  a failing fixture or transition test first, and is mutation-checked to bite.
- **Critic self-review:** a fresh critic/reviewer (worker ≠ grader) verifies before "done".
- **Security review** before touching `.claude/hooks/`, `assets/`, or `manifest.json`.
- Read before edit (ADR-0003). Conventional commits; branch `phase-N/<topic>`.

## Harness config
- Tier: **Full (Tier 3)** · Observability: **ON** · Last updated: 2026-06-03.
- See `.claude/starter-context.json`, `.claude/settings.json` (+ `.claude/hooks/`),
  `.claude/agents/drift-monitor.md`, `.claude/memory/`, `docs/architecture.md`, `docs/CODEMAPS/`,
  `docs/adr/`. `.claude/logs/` (observe.py output) is gitignored.
