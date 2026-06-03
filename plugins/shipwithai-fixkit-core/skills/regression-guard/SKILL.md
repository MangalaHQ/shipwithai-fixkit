---
name: regression-guard
description: "Leave the layer-appropriate guard artifact after a fix (test, assertion, CI check, or gap-log) so the bug cannot silently return."
version: 0.1.0
license: MIT
user-invocable: false
---

# Regression guard — make the bug unable to return

GUARD is the last phase of the spine. A fix without a guard is a fix that will regress. This
sub-skill leaves an artifact matched to the symptom layer and records it in `ledger.guard`.

## Guard by layer

| Symptom layer | Guard artifact |
|---|---|
| **Logic** | the failing automated test, kept (it pins the corrected behaviour) |
| **UI** | a live assertion (computed-style / DOM / console) that the layer-agent can re-run; if ASSIST, a documented manual re-check |
| **System** | a CI check or an instrumented-boundary assertion on the pipeline |

The guard must exercise the **root cause**, not just the symptom. A guard that would still pass
with the bug reintroduced is not a guard.

## When the layer is ASSIST

If the adapter cannot run the artifact here, you cannot leave an automated guard. Record a
**gap-log / handoff** entry instead: state exactly what guard a human/CI must add, and keep the
ledger at `candidate`. Do not claim an automated guard you cannot run — that is the same
dishonesty the integrity rule forbids.

## Output (written to the ledger)

- `guard`: a path or description of the artifact left (e.g. a test file path, a CI check name, or
  a gap-log reference).
- The guard is part of the evidence the orchestrator's integrity check reads before `close`.

## Design-organism root cause (Axis B != Axis A)

If diagnosis routed the root cause to an upstream design organism, there is **no consumer fix**
to guard. The guard is a **gap-log to the upstream owner**, the consumer repo is left untouched,
and the bug ends `escalated`. The system must not report "fixed".

## What this does NOT do

- It does not select the proof (see `verification`) or find the root cause (see `spine`).
- It does not close the ledger; it supplies the guard the orchestrator's integrity check reads.
- It does not author org-specific hard-lock guards — that is the Phase-1 pack's job.
- It does not fabricate a guard for an ASSIST fix; it gap-logs instead.
