# Contributing — shipwithai-fixkit

## Getting started
1. Clone the repo; it is a Claude Code plugin marketplace (no build step).
2. Run the gate locally: `cd plugins/shipwithai-fixkit-core && node tests/run-all.js`.

## Workflow (ADR-0002 / ADR-0003)
- **Plan before execute.** Non-trivial work needs a `PLAN.md` and approval before production files.
- **Read before edit.** AUDIT → IMPACT → PLAN → approve → execute. Targeted section edits, not
  wholesale rewrites.
- **Worker ≠ grader.** A fresh reviewer/critic verifies completion; the author does not self-approve.

## Required files per plugin
`.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `manifest.json`, `CLAUDE.md`,
`README.md`, `CHANGELOG.md`, ≥1 `skills/*/SKILL.md`, ≥1 `skills/*/evals/evals.json`.

## Quality rules (enforced by `tests/run-all.js`, BLOCKING)
| Rule | Limit |
|---|---|
| `SKILL.md` | < 200 lines |
| references | < 150 lines |
| bundles | < 500 lines |
| inline code block in SKILL.md | ≤ 20 lines |
| skill `description` | < 200 chars |
| evals per skill | ≥ 5 (≥ 3 trigger / ≥ 2 must-not-trigger) |
| version sync | 4 keys equal |
| sub-skills | ≥ 1 `user-invocable:false` |
| scope guard | every skill/agent ends with `## What this … does NOT do` |

## Branch & commits
- Branch: `phase-N/<topic>` (this scaffold: `phase-0/fixkit-core`).
- Commit messages: imperative, scoped (e.g. `core: add ledger state machine`).
- A version bump in `plugin.json` on `main` publishes via `publish-plugin.yml`.

## What changes need an ADR
Any structural decision that extends or diverges from the `shipwithai-plugins` blueprint
(e.g. ADR-0004's blocking limits + the deterministic gate).
