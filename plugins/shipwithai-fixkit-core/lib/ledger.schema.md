# Ledger schema (per-bug file)

Each bug is one markdown file with **YAML frontmatter** plus a markdown body. Runtime ledgers live
in a project's **`.fixkit/` directory, committed** (auditable history). This plugin repo does not
ship a `.fixkit/`; its committed ledgers are the test fixtures under `evals/fixtures/ledger/`. The
auditor for any ledger is `lib/ledger-validator.js` (`validateLedger`).

## Frontmatter fields

| Field | Type | Notes |
|---|---|---|
| `id` | string | e.g. `BUG-0001` |
| `symptom_layer` | enum | `UI` \| `Logic` \| `System` (Axis A, set at intake) |
| `subtype` | string | per-layer subtype (see `triage`) |
| `severity` | enum | `sev1` \| `sev2` \| `sev3` \| `sev4` |
| `state` | enum | see lifecycle below |
| `root_cause` | string | written at diagnosis; empty until then |
| `root_cause_layer` | enum | `UI` \| `Logic` \| `System` \| `upstream` (Axis B); empty until diagnosis |
| `3_strikes_count` | integer | failed-fix counter |
| `verification` | object | `{ method, capability_tier, evidence, verified_by }` |
| `verification.method` | string | layer-appropriate proof (e.g. `test-run`, `computed-style`, `instrumented-boundary`) |
| `verification.capability_tier` | enum | `FULL` \| `ASSIST` \| `NONE` |
| `verification.evidence` | string | the observed proof; empty until verified |
| `verification.verified_by` | string | who/what observed it |
| `hard_lock_violations` | array | Phase-1 seam; `[]` in Phase 0 |
| `guard` | string | the regression artifact left after the fix |

## Lifecycle states

```
open -> reproduced -> diagnosed -> (gated) -> fixed | candidate -> verified -> closed
                                          \-> escalated
```

- `open` → intake + classified
- `reproduced` → repro steps recorded
- `diagnosed` → `root_cause` written (Iron Law gate)
- `gated` → approval policy applied (optional; Phase 0 = none)
- `fixed` → smallest change applied (FULL path)
- `candidate` → ASSIST path; handoff/v0 emitted; awaiting external verification
- `verified` → layer proof recorded
- `closed` → integrity rule satisfied (terminal)
- `escalated` → 3-strikes exhausted, design-organism root cause, or upstream trigger

## State-transition guards (enforced by `lib/ledger-validator.js`)

| Guard | Rule code | Meaning |
|---|---|---|
| Iron Law | `IRON_LAW_FIX_BEFORE_ROOT_CAUSE` | cannot enter `fixed`/`candidate` (or sit at any post-fix state) without a non-empty `root_cause` |
| Integrity (evidence) | `INTEGRITY_EVIDENCE_EMPTY` | `closed` requires non-empty `verification.evidence` |
| Integrity (verifier) | `INTEGRITY_VERIFIER_MISSING` | `closed` requires a named `verification.verified_by` |
| ASSIST ceiling | `ASSIST_CANNOT_CLOSE` | an `ASSIST` ledger may not be `closed` (max `candidate`) |
| Layer-proof binding | `VERIFICATION_LAYER_MISMATCH` | proof `method` must match `symptom_layer` (a UI bug never closes on a source diff) |
| 3-strikes | `THREE_STRIKES_NO_ESCALATION` | `3_strikes_count >= 3` requires `state: escalated` |

Two surfaces enforce these: `validateLedger(snapshot)` audits a frozen ledger; `applyTransition
(ledger, event)` is the guard the orchestrator calls before mutating state.

## Body sections (convention)

`# <id> — <title>`, then `## Reproduce`, `## Isolate / Diagnose`, `## Fix`, `## Verify`,
`## Guard`. The body is human-readable narrative; the frontmatter is the machine-checked truth.
