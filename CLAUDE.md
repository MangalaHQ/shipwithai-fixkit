# CLAUDE.md — shipwithai-fixkit (repo)

Runtime guidance for working in this repo. Conforms to `../shipwithai-plugins` conventions
(ADR-0001).

## What this repo is
The public, stack-agnostic bug-fix engine. Phase 0 ships **`shipwithai-fixkit-core`** only — no
adapters, no pack, no org-specific hard-locks.

## Commands
- Run the Phase-0 gate: `cd plugins/shipwithai-fixkit-core && node tests/run-all.js` (exit 0 = green).
- The stub fixture's lifecycle: `node …/stub-adapter/reproduce.test.js` (fails on `buggy.js`) then
  `node …/stub-adapter/verify.test.js` (passes on `fixed.js`).

## Architecture rules
- Layering: Commands → Skills → References/Assets. No upward imports.
- Compose by **convention**, never by `plugin.json` dependency wiring: slash-path references +
  `user-invocable:false` sub-skills + `agents/*.md`.
- The ledger is the single source of truth for bug state; its guards live in
  `lib/ledger-validator.js`. `commands/fix.md` cites the same rule-codes.
- Every skill and agent ends with `## What this … does NOT do`.

## Quality limits (BLOCKING in tests/run-all.js)
- `SKILL.md` < 200 lines; references < 150; bundles < 500; inline code blocks ≤ 20 lines.
- Skill `description` < 200 chars.
- ≥ 5 evals per skill, with ≥ 3 trigger / ≥ 2 must-not-trigger (`shouldTrigger` boolean).
- 4-key version sync: `plugin.json` == per-plugin `marketplace.json` (top-level **and**
  `plugins[0]`) == root `marketplace.json` entry.
- ≥ 1 skill is a `user-invocable:false` sub-skill.

## Vendored spine
`skills/spine/SKILL.md` is a condensed adaptation of `superpowers:systematic-debugging`
(MIT © 2025 Jesse Vincent). Keep the license header + the top-level `NOTICE` in sync if you refresh
it from upstream.

## Versioning
SemVer in `plugin.json` is the source of truth; mirror it into both marketplace files. A bump on
`plugins/**/.claude-plugin/plugin.json` on `main` triggers `publish-plugin.yml`.

## Phase boundaries
Adapters, the pack, hard-locks (AD-027 etc.), real `~~browser`/`~~ci`/`~~monitoring` connectors,
and the three live `shipwithai.io` bugs are **Phase 1+**. Do not build them in core; only wire the
seams (`hard_lock_violations`, the pre-fix hook, shared rule-codes).
