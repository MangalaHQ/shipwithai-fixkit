# handoff/v0 schema (the verification handoff)

When a layer is **ASSIST** — the agent can build and diagnose but cannot *observe* the running
result (e.g. a UI bug when no `~~browser` is wired, or Claude Code with no Chrome) — the engine
does not guess. It emits a **`handoff/v0`**: a precise, machine-checkable request for someone who
*can* observe to perform the proof. A **verification provider** (Cowork via browser, a CI visual
snapshot, a device farm, or a human following the steps) runs it, records the observed evidence,
and fills `verified_by`. Only a *filled* handoff lets the ledger advance past `candidate`.

This is `v0`, defined now (Phase 1) so later phases (P3/P4 mobile/KMP ASSIST) inherit one format.
Validated by `lib/handoff-validator.js` (`validateHandoff`). Zero dependencies.

## Fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `version` | string | yes | must be the literal `handoff/v0` |
| `bug_id` | string | yes | the ledger entry this handoff verifies (e.g. `BUG-0003`) |
| `symptom_layer` | enum | yes | `UI` \| `Logic` \| `System` — binds the allowed proof methods |
| `target` | object | yes | where to observe: `{ env, url?, device?, viewport? }`; `env` is required |
| `steps` | array | yes | ordered actions to reproduce/observe (non-empty) |
| `assertion` | object | yes | `{ method, expected }` — the proof and its observable result |
| `assertion.method` | string | yes | must be a proof in `LAYER_METHODS[symptom_layer]` (same binding the ledger close-path enforces) |
| `assertion.expected` | string | yes | the observable that proves the fix (e.g. `scrollWidth <= clientWidth on pre`) |
| `verified_by` | string\|null | slot | present as a key; `null` until a provider observes the result. The provider sets it (and writes evidence into the ledger). |

## Lifecycle tie-in

```
ASSIST layer -> engine emits handoff/v0 (verified_by: null) -> ledger state: candidate
provider observes -> sets verified_by + records evidence -> ledger may enter verified -> closed
```

An unfilled handoff (`verified_by: null`) is a **valid request**, not a failure. The ledger's
`ASSIST_CANNOT_CLOSE` ceiling holds until the provider fills it. The layer-proof binding
(`HANDOFF_LAYER_MISMATCH`) mirrors the ledger's `VERIFICATION_LAYER_MISMATCH`: a handoff can never
promise a proof the ledger would later reject (e.g. a UI handoff asserting `test-run`).

## Rule codes

`HANDOFF_BAD_VERSION` · `HANDOFF_NO_BUG_ID` · `HANDOFF_BAD_LAYER` · `HANDOFF_NO_TARGET_ENV` ·
`HANDOFF_NO_STEPS` · `HANDOFF_NO_ASSERTION` · `HANDOFF_LAYER_MISMATCH` · `HANDOFF_NO_EXPECTED` ·
`HANDOFF_NO_VERIFIED_BY_SLOT`.

## Example (web UI, awaiting Cowork's live-DOM measurement)

```json
{
  "version": "handoff/v0",
  "bug_id": "BUG-0003",
  "symptom_layer": "UI",
  "target": { "env": "local-dev", "url": "http://localhost:4321/blog/x", "device": "desktop", "viewport": "1280x800" },
  "steps": ["open the URL", "select the code-block <pre>", "read scrollWidth and clientWidth"],
  "assertion": { "method": "computed-style", "expected": "scrollWidth <= clientWidth on the pre at 1280/768/375 widths; console clean" },
  "verified_by": null
}
```
