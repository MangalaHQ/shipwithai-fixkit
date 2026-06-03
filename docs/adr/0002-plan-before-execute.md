# ADR-0002 — Plan before execute

**Status:** Accepted (carried over from `shipwithai-plugins`).

## Context
Non-trivial work executed without a reviewed plan produces misaligned or partial results that need
rework.

## Decision
Any non-trivial change requires a written `PLAN.md` and an explicit approval (HALT gate) before
production files are written. The plan must cover the file tree, the key implementation decision,
verification ownership (mechanized vs judgment vs live-UI), and risks. After approval the executor
runs autonomously to a PR, then HALTs again for PR-out approval.

## Consequences
- Phase 0 produced `PLAN.md` and halted for plan-in approval before this build began.
- A fresh critic subagent refutes the work before it is called done (the worker is not the grader).
- `PLAN.md` is excluded from published plugin artifacts (see `publish-plugin.yml` rsync excludes).
