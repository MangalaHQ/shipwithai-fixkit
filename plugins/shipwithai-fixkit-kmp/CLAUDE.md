# CLAUDE.md — shipwithai-fixkit-kmp

Runtime guidance for working inside the **Kotlin Multiplatform (KMP) adapter**. Conforms to the
fixkit family conventions (ADR-0001). The engine it adapts is `shipwithai-fixkit-core`.

## What an adapter is (design-doc 09 §9)
An adapter is **thin**: mappings, recipes, declarations only. The debugging discipline, the layer-
agents, the ledger state machine, and the orchestrator all live in **core**. This plugin never
re-implements them — it tells core *how* to do its work on a KMP tree.

## What this adapter supplies
- **Connector mappings** (`CONNECTORS.md`): each core `~~category` → a concrete KMP tool.
- **Capability declaration** (`lib/capability.json`): **Logic / System = FULL; UI = ASSIST.**
- **Per-layer recipes** (skills): `kmp-environment`, `kmp-reproduce`, `kmp-verify`, `kmp-source-map`.

## The first real ASSIST exercise
KMP is where the engine proves it **refuses to over-claim** on a platform it cannot observe. Shared
`commonMain` logic runs on the JVM (Logic FULL); a Gradle build/dependency/config bug is observed
from the host (System FULL). But Compose/SwiftUI render on a **device with no connector wired** —
so **UI = ASSIST**: the engine builds + diagnoses, then emits a `handoff/v0` (core
`lib/handoff.schema.md`) and the ledger stops at `candidate`. It never auto-closes a UI bug. This is
the first adapter to declare a *standing* ASSIST tier.

## Capability boundary (System FULL is host-scoped)
System FULL covers what the agent can run + observe from the JVM/host: Gradle build, dependency
resolution, build config (`pipeline-run` / `ci-run` / `integration-test`). A System symptom that
appears **only at platform runtime** (device-only, unobservable from the host) is not a host-System
bug — it routes to the UI/ASSIST lane or to the Android/iOS adapters (P4).

## Mirror principle
**Verification mirrors reproduction.** Logic: a bug reproduced by a failing JVM test is verified by
that test passing + suite green. UI (ASSIST): reproduce = build + code-level diagnosis (never an
observed render); verify = a `handoff/v0` whose `assertion.method` is a UI `LAYER_METHODS` proof,
for a provider to observe. Never close on a source diff (core enforces `VERIFICATION_LAYER_MISMATCH`).

## Source-map seams
`commonMain` (shared) vs `androidMain` / `iosMain` + the Compose/SwiftUI view layer; `expect`/`actual`
declarations. Rule of thumb: **wrong on both platforms ⇒ shared (`commonMain`); wrong on one ⇒
platform.** See `kmp-source-map`.

## Run the gate
`node tests/run-all.js` (run from the repo root). Exit 0 = green. The gate reuses core's
`lib/ledger-validator.js` **and** `lib/handoff-validator.js` for its negative tests — the single
source of truth for bug state and the verification handoff (read-only; zero core edits).

## Conventions (BLOCKING in `tests/run-all.js`)
`SKILL.md` < 200 lines · max inline code block ≤ 20 lines · `description` < 200 chars · every skill
ends with `## What this … does NOT do` · ≥ 1 `user-invocable:false` sub-skill · ≥ 5 evals per skill
(≥ 3 trigger / ≥ 2 must-not) · 4-key version sync (`plugin.json` == per-plugin `marketplace.json`
top == `plugins[0]` == root marketplace kmp entry).

## What this plugin does NOT do
- It ships **no** debugging logic, layer-agents, or orchestration — those are core's.
- It does not re-implement the ledger, the verification matrix, the handoff format, or any guard.
- It does not bind any MCP server in code; `CONNECTORS.md` declares the mappings, the host wires them.
- It does not auto-close a UI bug (no device/`~~browser`): UI is ASSIST → emit `handoff/v0` → candidate.
- It does not run the real Gradle/JVM bug gate — that is the deferred gate-run (needs a named target).
