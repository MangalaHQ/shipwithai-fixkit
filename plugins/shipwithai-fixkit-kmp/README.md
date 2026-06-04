# shipwithai-fixkit-kmp

The **thin Kotlin Multiplatform adapter** for the `shipwithai-fixkit-core` engine. It teaches the
engine how to reproduce, verify, and locate bugs on a KMP tree without re-implementing any of the
engine itself — and it is the family's **first real ASSIST exercise**.

## What it provides
- **Connector mappings** (`CONNECTORS.md`): `~~test-runner` → `./gradlew :shared:test` (JVM), `~~ci`
  → GitHub Actions, `~~runtime` → JVM, `~~source control` → git/GitHub. **No `~~browser`, no device.**
- **Capability declaration** (`lib/capability.json`): **Logic / System = FULL, UI = ASSIST.**
- **Four recipe skills:** `kmp-environment` (user-invocable; locate Gradle + JVM, build hygiene),
  `kmp-reproduce`, `kmp-verify`, `kmp-source-map` (sub-skills).

## Capability + the ASSIST ceiling
Logic FULL needs `~~test-runner` (shared `commonMain` on the JVM); System FULL is host-observable
Gradle build / dependency / config. **UI = ASSIST**: Compose/SwiftUI render on a device with no
connector wired, so `kmp-verify` builds + diagnoses but emits a `handoff/v0` (core
`lib/handoff.schema.md`) — `verified_by: null`, ledger stops at `candidate` — for a provider to
observe and fill. It never auto-closes a UI bug.

## Mirror principle
Verification mirrors reproduction: a Logic bug reproduced by a failing JVM test is verified by that
test passing; a UI bug diagnosed but not observable yields a handoff whose assertion mirrors the
intended observation — never a source diff.

## Develop
`node tests/run-all.js` (from the repo root) runs this plugin's blocking gate: both stub-fixture
lifecycles (logic red→green; the ASSIST handoff + candidate), the capability declaration, the
negative tests (via core's `validateLedger` + `validateHandoff`), three mutation checks, the
convention linters, and the 4-key version sync. Exit 0 = green.

## Scope
A Phase-3 adapter. It maps connectors and ships recipes; it ships **no** debugging logic, layer-
agents, or orchestration (those are core). The `evals/fixtures/kmp-stub-*` are synthetic, zero-
dependency test scaffolding — the real Gradle/JVM bug runs are the deferred gate-run.

## License
MIT.
