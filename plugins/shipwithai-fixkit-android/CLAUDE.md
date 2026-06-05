# CLAUDE.md — shipwithai-fixkit-android

Runtime guidance for working inside the **Android adapter**. Conforms to the fixkit family
conventions (ADR-0001). The engine it adapts is `shipwithai-fixkit-core`.

## What an adapter is (design-doc 09 §9)
An adapter is **thin**: mappings, recipes, declarations only. The debugging discipline, the layer-
agents, the ledger state machine, and the orchestrator all live in **core**. This plugin never
re-implements them — it tells core *how* to do its work on an Android tree.

## What this adapter supplies
- **Connector mappings** (`CONNECTORS.md`): each core `~~category` → a concrete Android/Gradle tool.
- **Capability declaration** (`lib/capability.json`): **Logic / System = FULL; UI = ASSIST.**
- **Per-layer recipes** (skills): `android-environment`, `android-reproduce`, `android-verify`,
  `android-source-map`.

## The ASSIST exercise (honest mobile coverage)
Android is one of the two weakest-platform adapters where the engine proves it **refuses to
over-claim**. App/business logic runs on the host JVM (`./gradlew testDebugUnitTest`) → Logic FULL; a
Gradle build/dependency/config bug is observed from the host → System FULL. But Compose/View screens
render on an **emulator/device with no connector wired** — so **UI = ASSIST**: the engine builds +
diagnoses, then emits a `handoff/v0` (core `lib/handoff.schema.md`) and the ledger stops at
`candidate`. It never auto-closes a UI bug.

## Capability boundary (FULL is host-scoped)
Logic/System FULL covers what the agent can run + observe from the JVM/host: unit tests, Gradle build,
dependency resolution, build config (`pipeline-run` / `ci-run` / `integration-test`). A symptom that
appears **only at device runtime** (unobservable from the host) is not a host bug — it routes to the
UI/ASSIST lane.

## Device proof reuses core's UI methods (no core change)
A device `handoff/v0` asserts with an existing UI `LAYER_METHODS` proof, by symptom subtype:
- layout / clipping / overflow / safe-area → `computed-style`
- tap / gesture / navigation / state-change → `interaction-assertion`
- logcat / crash-log output → `console-assertion`

These honestly describe what a device provider observes — **no new method is added to core.**

## Mirror principle
**Verification mirrors reproduction.** Logic: a bug reproduced by a failing JVM unit test is verified
by that test passing + suite green. UI (ASSIST): reproduce = build + code-level diagnosis (never an
observed render); verify = a `handoff/v0` whose `assertion.method` is a UI `LAYER_METHODS` proof, for
a provider to observe. Never close on a source diff (core enforces `VERIFICATION_LAYER_MISMATCH`).

## Source-map seams
Activity / Fragment / Compose tree vs ViewModel vs resource/layout vs pure logic; `logcat` → source.
Rule of thumb: a wrong value computed in a unit test ⇒ logic/ViewModel; a render-only symptom on the
device ⇒ UI/ASSIST. See `android-source-map`.

## Run the gate
`node plugins/shipwithai-fixkit-android/tests/run-all.js` (run from the repo root). Exit 0 = green.
The gate reuses core's `lib/ledger-validator.js` **and** `lib/handoff-validator.js` for its negative
tests — the single source of truth for bug state and the verification handoff (read-only; zero core edits).

## Conventions (BLOCKING in `tests/run-all.js`)
`SKILL.md` < 200 lines · max inline code block ≤ 20 lines · `description` < 200 chars · every skill
ends with `## What this … does NOT do` · ≥ 1 `user-invocable:false` sub-skill · ≥ 5 evals per skill
(≥ 3 trigger / ≥ 2 must-not) · 4-key version sync (`plugin.json` == per-plugin `marketplace.json`
top == `plugins[0]` == root marketplace android entry).

## What this plugin does NOT do
- It ships **no** debugging logic, layer-agents, or orchestration — those are core's.
- It does not re-implement the ledger, the verification matrix, the handoff format, or any guard.
- It does not bind any MCP server in code; `CONNECTORS.md` declares the mappings, the host wires them.
- It does not auto-close a UI bug (no device/`~~browser`): UI is ASSIST → emit `handoff/v0` → candidate.
- It does not run the real Gradle/JVM bug gate — that is the deferred gate-run (needs a named target).
