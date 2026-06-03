---
name: spine
description: "REPRODUCE-ISOLATE-DIAGNOSE-FIX-VERIFY-GUARD discipline: Iron Law, one hypothesis / smallest change, 3-strikes escalation. Vendored from superpowers:systematic-debugging."
version: 0.1.0
license: MIT
user-invocable: false
---

<!--
  VENDORED SPINE — attribution (see also the top-level NOTICE).
  Adapted from `superpowers:systematic-debugging` by Jesse Vincent.
  Source: claude-plugins-official/superpowers/skills/systematic-debugging/SKILL.md
  Upstream license: MIT (c) 2025 Jesse Vincent. Full license text preserved in /NOTICE.
  This is a condensed adaptation (the upstream skill is longer than the fixkit 200-line
  limit). The Iron Law is preserved verbatim; the 6-token spine is fixkit's own vocabulary.
-->

# Spine — the invariant debugging discipline

Every bug, every layer, runs the same spine. It is a sub-skill: the orchestrator and the
layer-agents embed it. Random fixes waste time and mask the real defect.

```
REPRODUCE -> ISOLATE -> DIAGNOSE -> FIX -> VERIFY -> GUARD
```

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

You cannot enter FIX until a root cause is written to the ledger. The state machine enforces
this: `applyTransition(ledger, 'enter_fixed')` is refused with `IRON_LAW_FIX_BEFORE_ROOT_CAUSE`
while `root_cause` is empty. Symptom fixes are failure.

## The phases

### 1. REPRODUCE
Trigger the failure reliably using the adapter's recipe for the symptom layer. No reliable
reproduction → gather more evidence, do not guess. Record the steps; move the ledger to
`reproduced`.

### 2. ISOLATE
Narrow to the smallest failing surface. In multi-component systems, instrument each boundary
(what enters, what exits) and run once to see *where* it breaks before asking *why*.

### 3. DIAGNOSE (root cause)
Trace the bad value/behaviour back to its origin. Write `root_cause` and `root_cause_layer` to
the ledger; move to `diagnosed`. If the root-cause layer differs from the symptom layer, the
orchestrator re-dispatches to the correct layer-agent.

### 4. FIX
One hypothesis at a time, the **smallest possible change**. No bundled refactoring, no "while
I'm here". Check hard-locks first (Phase-1 seam). If a fix attempt fails, return to DIAGNOSE
with the new information — do not stack another fix on top.

### 5. VERIFY
Proof is dictated by the symptom layer and the adapter's capability tier (see the `verification`
skill). FULL → run and observe → `verified`. ASSIST → emit `handoff/v0` → `candidate`. Never
assume; never close a rendered bug on a source diff.

### 6. GUARD
Leave the layer-appropriate regression artifact (see the `regression-guard` skill) so the bug
cannot silently return. Then the orchestrator's integrity check closes the ledger.

## 3-strikes escalation

Count failed fix attempts on the ledger (`3_strikes_count`).

- **< 3 failures:** return to DIAGNOSE and re-analyse with the new evidence.
- **>= 3 failures:** STOP. Do not attempt fix #4. This is not a failed hypothesis — it is a
  wrong architecture. Question fundamentals, look one layer up, and escalate. The state machine
  fires `state -> escalated` on the 3rd recorded failure (`record_fix_failure`).

## Red flags — STOP and return to REPRODUCE

- "Quick fix now, investigate later."
- "Just try changing X and see."
- "Multiple changes at once, then run tests."
- "It's probably X, let me fix that." (proposing a fix before tracing data flow)
- "One more fix attempt" (when you have already tried 2+).

## What this does NOT do

- It does not classify the bug (see `triage`) or pick the proof method (see `verification`).
- It does not implement org-specific hard-locks — it only marks the pre-fix seam.
- It does not close ledgers; the orchestrator's integrity rule does.
- It does not replace the upstream `superpowers:systematic-debugging` skill; it vendors a
  condensed form of that discipline with attribution.
