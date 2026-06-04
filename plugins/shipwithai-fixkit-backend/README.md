# shipwithai-fixkit-backend

The **thin backend adapter** for the `shipwithai-fixkit-core` engine. It teaches the engine how to
reproduce, verify, and locate bugs on a runnable backend stack without re-implementing any of the
engine itself.

## What it provides
- **Connector mappings** (`CONNECTORS.md`): `~~test-runner` → npm/vitest/jest/pytest, `~~ci` →
  GitHub Actions, `~~monitoring` → structured boundary logs (alt: Sentry-class MCP), `~~runtime` →
  local service / in-process harness, `~~source control` → git/GitHub.
- **Capability declaration** (`lib/capability.json`): **Logic / System = FULL, UI = NONE**.
- **Four recipe skills:** `backend-environment` (user-invocable; stand up/clean the target),
  `backend-reproduce`, `backend-verify`, `backend-source-map` (sub-skills).

## Capability + UI refusal
Logic FULL needs `~~test-runner`; System FULL needs the shell/`~~ci` + `~~monitoring`. **UI = NONE**:
a UI-symptom bug is refused and re-routed at triage to a UI-capable adapter (doc 09 §6).

## Mirror principle
Verification mirrors reproduction: a Logic bug reproduced by a failing test is verified by that test
passing; a System bug reproduced by a boundary log is verified by that boundary log — never a diff.

## Develop
`node tests/run-all.js` (from the repo root) runs this plugin's blocking gate: both stub-fixture
lifecycles, the capability declaration, the negative tests (via core's validator), the convention
linters, and the 4-key version sync. Exit 0 = green.

## Scope
A Phase-2 adapter. It maps connectors and ships recipes; it ships **no** debugging logic,
layer-agents, or orchestration (those are core). The `evals/fixtures/backend-stub-*` are synthetic
test scaffolding, not real targets.

## License
MIT.
