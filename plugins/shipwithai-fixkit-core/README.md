# shipwithai-fixkit-core

The reusable, stack-agnostic bug-fix engine. Classify by symptom layer, debug on a vendored
systematic-debugging spine, and close only on layer-appropriate proof.

## Install / use
Once published to the `shipwithai-fixkit` marketplace, run the orchestrator:

```
/shipwithai-fixkit-core:fix <bug description | screenshot url | failing job>
```

It opens a ledger entry under `.fixkit/`, classifies the symptom, dispatches an isolated
layer-agent, and walks the bug through `reproduce → diagnose → fix → verify → guard → close`.

## What it guarantees
- **Iron Law:** no fix is reachable before a written root cause.
- **Integrity rule:** a bug closes only with layer-appropriate evidence and a named verifier; no
  runner → handoff/v0 (max `candidate`).
- **Verification by layer:** a rendered (UI) bug never closes on a source diff.
- **3-strikes:** three failed fixes fire escalation — stop and question the architecture.

These are enforced by `lib/ledger-validator.js`, exercised deterministically by `tests/run-all.js`.

## Components
`commands/fix.md` (orchestrator) · `skills/{triage,spine,verification,regression-guard}` ·
`agents/{ui,logic,system}-bug-agent.md` · `lib/ledger.schema.md` + `lib/ledger-validator.js` ·
`CONNECTORS.md` · `evals/` (prompts + fixtures).

## Develop
`node tests/run-all.js` runs the Phase-0 gate (acceptance checks + honesty invariants + linters).
Exit 0 = green.

## Scope
Phase 0 = the engine only. Adapters (web/backend/kmp/android/ios), the ShipWithAI pack, and
hard-locks are Phase 1+. The `stub-adapter` under `evals/fixtures/` is test scaffolding, not a real
adapter.

## License
MIT. Vendored spine credited in the repo-level `NOTICE`.
