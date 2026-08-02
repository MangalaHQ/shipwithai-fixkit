---
name: triage
description: "Classify a bug by symptom layer (UI / Logic / System), subtype, and severity before reproduction. Triggers: 'triage this bug', 'what layer is this', 'classify the bug'."
version: 0.1.0
license: MIT
user-invocable: true
---

# Triage — Axis-A classifier

Triage is the **intake** step of the fix loop. It answers one question: *what layer does the
symptom live in?* That answer routes the Reproduce recipe and selects the layer-agent. It does
**not** decide where the root cause is — that is Axis B, known only after diagnosis.

## When to use

- A bug report arrives (text, screenshot, stack trace, failing job).
- You need to open or update a ledger entry's `symptom_layer`, `subtype`, `severity`.

## Axis A — symptom layer (known at intake)

| Layer | Subtypes | Example symptoms |
|---|---|---|
| **UI** | visual/styling · layout/responsive · interaction/behavior · client-runtime · a11y | button does nothing; code block overflows; console "storage not allowed" |
| **Logic** | wrong-output · state · edge-case · data-transform · in-app async/race | total off by one; parser drops a field; wrong branch taken |
| **System** | build · config/env · dependency/integration · API-contract · database · infra/CI · perf | version mismatch; CI signing fails; API 500 under load |

Pick the layer the **symptom is observed in**, not where you suspect the cause is. If the report
spans layers, classify by the layer where the failure is *first observable* and note the rest in
the ledger body.

## Severity

| Severity | Meaning |
|---|---|
| `sev1` | broken for all users / data loss / security |
| `sev2` | core flow wrong or broken for many |
| `sev3` | visible defect, workaround exists |
| `sev4` | minor / cosmetic |

## Output (written to the ledger)

Set these frontmatter fields and leave `state: open`:

- `symptom_layer`: `UI` | `Logic` | `System`
- `subtype`: one of the layer's subtypes above
- `severity`: `sev1`..`sev4`
- `root_cause_layer`: leave empty — it is unknown until diagnosis (Axis B)

The orchestrator (`/shipwithai-fixkit-core:fix`) reads this classification to select the matching
layer-agent and the adapter's Reproduce recipe.

## multi-repo precondition (explicit input only)

If the invoker signals a **multi-repo design-system setup** (a `multi_repo` invocation arg or a
project-config field), record `multi_repo: true` on the ledger. This is a **precondition**, not a
classification decision:

- Triage does **not** scan `node_modules` / `package.json` scopes to detect it — auto-detection is a
  Phase-1 pack/adapter concern; core is stack-agnostic and takes `multi_repo` as explicit input.
- Triage does **not** set `fix_source` — which repo owns the fix (`consumer` / `design-repo` /
  `both`) depends on the root cause and is decided at DIAGNOSE (Axis B), not at intake.

When absent, `multi_repo` defaults to `false` and the cross-repo guards stay dormant (single-repo
behaviour is unchanged).

## Axis A vs Axis B (why two moments)

- **At intake (now):** Axis A = symptom layer → routes Reproduce.
- **After diagnosis (later):** Axis B = root-cause layer → routes Fix and, if `root_cause_layer`
  differs from `symptom_layer`, re-dispatch to the correct layer-agent. A UI symptom whose root
  cause is an upstream design organism is **not** fixed in the consumer — it is gap-logged and the
  bug ends `escalated`. That re-dispatch is the orchestrator's job, not triage's.

## What this does NOT do

- It does not reproduce, diagnose, or fix anything — it only classifies the symptom.
- It does not assign `root_cause` or `root_cause_layer` (that is diagnosis / Axis B).
- It does not decide capability tier or verification method (see the `verification` skill).
- It does not scan `node_modules` to detect `multi_repo`, nor decide `fix_source` (Axis B / DIAGNOSE).
- It does not author features or answer general questions — only existing defects are triaged.
