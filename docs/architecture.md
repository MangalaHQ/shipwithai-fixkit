# Architecture Overview

*Repo-level view for shipwithai-fixkit. Upstream design SOT: `../shipwithai-fixkit-design/`
(canonical `09-ARCHITECTURE-SPEC-V2.md`). Edit directly.*

## System overview

`shipwithai-fixkit` is the public, stack-agnostic **bug-fix engine** of the fixkit family — a Claude
Code plugin monorepo. Phase 0 ships `shipwithai-fixkit-core`: classify a bug by symptom layer, debug
it on a vendored systematic-debugging spine, and close it only on **layer-appropriate proof**. The
Iron Law (no fix before root cause), the integrity rule (no runner → no auto-close → handoff/v0), and
3-strikes escalation are enforced by a **ledger state machine**, not by intent.

Artifacts are Markdown (skills, agents, docs), JSON (plugin/manifest/marketplace, evals), and a thin
**zero-dependency Node** trust anchor (the validator + its tests). No build step, no package manager.

## Key layers

| Layer | Directory | Responsibility |
|-------|-----------|----------------|
| Orchestrator | `plugins/shipwithai-fixkit-core/commands/` | `fix.md` — main-thread loop: intake → classify → dispatch → gate → verify → close |
| Skills | `plugins/shipwithai-fixkit-core/skills/` | `triage` (Axis-A), `spine` (vendored), `verification`, `regression-guard` |
| Agents | `plugins/shipwithai-fixkit-core/agents/` | isolated UI / Logic / System layer-fixers |
| Trust anchor | `plugins/shipwithai-fixkit-core/lib/` | `ledger-validator.js` — state machine (`validateLedger` + `applyTransition`); `ledger.schema.md` |
| Gate | `plugins/shipwithai-fixkit-core/tests/` | `run-all.js` — deterministic gate over fixtures + linters |
| Harness | `.claude/` | settings.json, hooks/, agents/, memory/, starter-context.json |
| Docs | `docs/` | architecture.md, adr/, CODEMAPS/ |

## Entry points

| File | Purpose |
|------|---------|
| `plugins/shipwithai-fixkit-core/commands/fix.md` | The `/shipwithai-fixkit-core:fix` orchestrator |
| `plugins/*/manifest.json` | Claude Code skill registry |
| `.claude-plugin/marketplace.json` | Marketplace registry (root + per-plugin) |
| `.claude/settings.json` | Permission rules + safety hooks |

## External dependencies

None. Zero runtime dependencies; the validator and tests use only the Node standard library.

## Key directories

```
shipwithai-fixkit/
├── plugins/shipwithai-fixkit-core/
│   ├── commands/fix.md              ← orchestrator (main thread)
│   ├── skills/{triage,spine,verification,regression-guard}/SKILL.md
│   ├── agents/{ui,logic,system}-bug-agent.md
│   ├── lib/ledger-validator.js      ← trust anchor (state machine)
│   ├── lib/ledger.schema.md         ← ledger schema + lifecycle + guards
│   ├── tests/run-all.js             ← deterministic gate (CI hook)
│   ├── evals/fixtures/              ← ledger fixtures + stub-adapter (NOT a real adapter)
│   └── CONNECTORS.md                ← ~~category placeholders
├── .claude/                         ← harness (settings, hooks, agents, memory)
├── docs/{architecture.md,adr/,CODEMAPS/}
├── NOTICE                           ← vendored-spine MIT attribution
└── .github/workflows/{validate,publish}-plugin.yml
```

## What to know before touching code

### Gotchas

| Area | Rule |
|------|------|
| `lib/ledger-validator.js` + `tests/run-all.js` | The deterministic trust anchor — change tests-first, mutation-check, never weaken a guard without a replacement |
| `NOTICE` + `skills/spine/SKILL.md` | Vendored `superpowers:systematic-debugging` (MIT © 2025 Jesse Vincent) — keep attribution in sync |
| `manifest.json` | Must stay in sync with `skills/` subdirectories |
| `.claude-plugin/*.json` + root `marketplace.json` | 4-key version sync |
| `.claude/hooks/*.py` | Python safety hooks — must not be removed or broken |

### Sensitive areas

| Directory / file | Why it needs extra care |
|------------------|-------------------------|
| `lib/ledger-validator.js` | Guards Iron Law / integrity / 3-strikes — the product's honesty |
| `tests/run-all.js` | The gate; its exit code is CI's blocking signal |
| `evals/fixtures/ledger/` | Negative tests — each fixture isolates ONE violation |
| `docs/adr/` | Architecture Decision Records |

### Build order

None — content + zero-dep Node, no compilation.

### Test isolation

Run `cd plugins/shipwithai-fixkit-core && node tests/run-all.js` (exit 0 = gate green, 67 checks).

## Future work

- Phase 1: web adapter, ShipWithAI pack, hard-locks plug into the `hard_lock_violations` seam.
- A GitHub remote + PR-out for the Phase-0 branch.
