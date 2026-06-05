# shipwithai-fixkit-android

A **thin Android adapter** for the [`shipwithai-fixkit-core`](../shipwithai-fixkit-core) bug-fix
engine. It maps the core's `~~connector` placeholders to concrete Android/Gradle tooling and ships
per-layer reproduce/verify/source-map recipes. **No debugging logic lives here** — the ledger state
machine, the layer-agents, and the orchestrator are all in core.

## Capability tiers

| Layer | Tier | Why |
|---|---|---|
| **Logic** | FULL | app/business logic runs on the host JVM via `./gradlew testDebugUnitTest` (JUnit/Robolectric); a failing unit test passing + suite green is the proof |
| **System** | FULL | a Gradle build / dependency / config bug is run + observed from the host (`./gradlew build`, `~~ci`); proof `pipeline-run` / `ci-run` / `integration-test` |
| **UI** | **ASSIST** | Compose/View render on an emulator/device with **no connector wired** — the engine builds + diagnoses, then emits a `handoff/v0` and the ledger stops at `candidate`. It never auto-closes a UI bug. |

**Boundary:** a Logic/System symptom that manifests *only* at device runtime (unobservable from the
host) is not a host bug — it routes to the UI/ASSIST lane.

## Device proof = `handoff/v0` (the integrity rule on the weakest platform)

With no device connector, a fixed Compose/View bug cannot be *observed* by the agent. The engine
emits a precise `handoff/v0` (core `lib/handoff.schema.md`): a device `target` (e.g. `Pixel 8 / API
35`), ordered `steps`, and one UI `LAYER_METHODS` assertion with an `expected` observable, leaving
`verified_by: null`. A provider (Cowork, a device farm, a human following the protocol) observes the
result, records evidence, and fills `verified_by`. **No recorded `verified_by` → no `closed`.** Device
proof reuses core's existing UI methods (`computed-style`, `interaction-assertion`,
`console-assertion`) — no core change.

## Skills

- `android-environment` — locate the Gradle wrapper + JDK; build hygiene; confirm the unit-test task.
- `android-reproduce` — Logic = a failing host-JVM unit test (written first); UI (ASSIST) = build + diagnose.
- `android-verify` — Logic = failing test passes + suite green; UI (ASSIST) = emit `handoff/v0`.
- `android-source-map` — Activity/Fragment/Compose vs ViewModel vs resource/layout vs logic; logcat → source.

## Run the gate

```bash
node plugins/shipwithai-fixkit-android/tests/run-all.js   # exit 0 = green (BLOCKING)
```

## What this plugin does NOT do
- It ships no debugging logic, layer-agents, or orchestration — those are core's.
- It does not re-implement the ledger, the verification matrix, the handoff format, or any guard.
- It does not bind any MCP server in code; `CONNECTORS.md` declares the mappings, the host wires them.
- It does not auto-close a UI bug (no device): UI is ASSIST → emit `handoff/v0` → candidate.
- It does not run the real Gradle/JVM bug gate — that is the deferred gate-run (needs a named target).
