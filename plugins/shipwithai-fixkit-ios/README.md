# shipwithai-fixkit-ios

A **thin iOS adapter** for the [`shipwithai-fixkit-core`](../shipwithai-fixkit-core) bug-fix engine.
It maps the core's `~~connector` placeholders to concrete Xcode/Swift tooling and ships per-layer
reproduce/verify/source-map recipes. **No debugging logic lives here** — the ledger state machine, the
layer-agents, and the orchestrator are all in core.

> **Host precondition:** the FULL claims require a **macOS host with the Xcode / Swift toolchain**.

## Capability tiers

| Layer | Tier | Why |
|---|---|---|
| **Logic** | FULL | app/business logic runs + reports pass/fail on the macOS host via `swift test` / `xcodebuild test`; the agent observes the test result, not a render; a failing unit test passing + suite green is the proof |
| **System** | FULL | a build / dependency / config bug is run + observed from the host (`xcodebuild build`, SwiftPM resolution, `~~ci`); proof `pipeline-run` / `ci-run` / `integration-test` |
| **UI** | **ASSIST** | SwiftUI/UIKit render on a simulator/device with **no connector wired** — the engine builds + diagnoses, then emits a `handoff/v0` and the ledger stops at `candidate`. It never auto-closes a UI bug. |

**Boundary:** a simulator/device-only render symptom (or an XCUITest UI assertion) is not a host bug —
it routes to the UI/ASSIST lane. The asymmetry with Android is the macOS host requirement, not a tier.

## Device proof = `handoff/v0` (the integrity rule on the weakest platform)

With no device connector, a fixed SwiftUI/UIKit bug cannot be *observed* by the agent. The engine
emits a precise `handoff/v0` (core `lib/handoff.schema.md`): a device `target` (e.g. `iPhone 16 / iOS
18`), ordered `steps`, and one UI `LAYER_METHODS` assertion with an `expected` observable, leaving
`verified_by: null`. A provider (Cowork, a device farm, a human following the protocol) observes the
result, records evidence, and fills `verified_by`. **No recorded `verified_by` → no `closed`.** Device
proof reuses core's existing UI methods (`computed-style`, `interaction-assertion`,
`console-assertion`) — no core change.

## Skills

- `ios-environment` — locate the `.xcodeproj`/scheme or `Package.swift`; build hygiene; confirm the test action.
- `ios-reproduce` — Logic = a failing host-runnable unit test (written first); UI (ASSIST) = build + diagnose.
- `ios-verify` — Logic = failing test passes + suite green; UI (ASSIST) = emit `handoff/v0`.
- `ios-source-map` — SwiftUI view / UIViewController vs ObservableObject/ViewModel vs storyboard/asset vs logic.

## Run the gate

```bash
node plugins/shipwithai-fixkit-ios/tests/run-all.js   # exit 0 = green (BLOCKING)
```

## What this plugin does NOT do
- It ships no debugging logic, layer-agents, or orchestration — those are core's.
- It does not re-implement the ledger, the verification matrix, the handoff format, or any guard.
- It does not bind any MCP server in code; `CONNECTORS.md` declares the mappings, the host wires them.
- It does not auto-close a UI bug (no device): UI is ASSIST → emit `handoff/v0` → candidate.
- It does not run the real Xcode/Swift bug gate — that is the deferred gate-run (needs a named target).
