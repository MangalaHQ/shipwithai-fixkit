# CLAUDE.md — shipwithai-fixkit-ios

Runtime guidance for working inside the **iOS adapter**. Conforms to the fixkit family conventions
(ADR-0001). The engine it adapts is `shipwithai-fixkit-core`.

## What an adapter is (design-doc 09 §9)
An adapter is **thin**: mappings, recipes, declarations only. The debugging discipline, the layer-
agents, the ledger state machine, and the orchestrator all live in **core**. This plugin never
re-implements them — it tells core *how* to do its work on an iOS tree.

## Host precondition
The FULL claims require a **macOS host with the Xcode / Swift toolchain**. The unit-test and build
loops run on that host. Off macOS, treat the host loop as unavailable. The asymmetry with Android
(which runs on any JVM host) is a host requirement, **not** a tier downgrade.

## What this adapter supplies
- **Connector mappings** (`CONNECTORS.md`): each core `~~category` → a concrete Xcode/Swift tool.
- **Capability declaration** (`lib/capability.json`): **Logic / System = FULL (macOS host); UI = ASSIST.**
- **Per-layer recipes** (skills): `ios-environment`, `ios-reproduce`, `ios-verify`, `ios-source-map`.

## The ASSIST exercise (honest mobile coverage)
iOS is one of the two weakest-platform adapters where the engine proves it **refuses to over-claim**.
App/business logic runs + reports on the macOS host (`swift test` / `xcodebuild test`) → Logic FULL
(the agent observes the test result, not a render); a build/dependency/config bug is observed from the
host → System FULL. But SwiftUI/UIKit screens render on a **simulator/device with no connector wired**
— so **UI = ASSIST**: the engine builds + diagnoses, then emits a `handoff/v0` (core
`lib/handoff.schema.md`) and the ledger stops at `candidate`. It never auto-closes a UI bug.

## Capability boundary (FULL is host-scoped)
Logic/System FULL covers what the agent can run + observe from the macOS host: unit tests, the build,
dependency resolution, build config (`pipeline-run` / `ci-run` / `integration-test`). A symptom that
appears **only at simulator/device runtime** (or an XCUITest UI assertion) is not a host bug — it
routes to the UI/ASSIST lane.

## Device proof reuses core's UI methods (no core change)
A device `handoff/v0` asserts with an existing UI `LAYER_METHODS` proof, by symptom subtype:
- layout / clipping / Dynamic-Type truncation / safe-area → `computed-style`
- tap / gesture / navigation / state-change → `interaction-assertion`
- Console.app / crash-log output → `console-assertion`

These honestly describe what a device provider observes — **no new method is added to core.**

## Mirror principle
**Verification mirrors reproduction.** Logic: a bug reproduced by a failing host-runnable test is
verified by that test passing + suite green. UI (ASSIST): reproduce = build + code-level diagnosis
(never an observed render); verify = a `handoff/v0` whose `assertion.method` is a UI `LAYER_METHODS`
proof, for a provider to observe. Never close on a source diff (core enforces `VERIFICATION_LAYER_MISMATCH`).

## Source-map seams
SwiftUI view / `UIViewController` vs `ObservableObject`/view model vs storyboard/asset vs pure logic;
a crash log → source. Rule of thumb: a wrong value computed in a unit test ⇒ logic/view model; a
render-only symptom on the device ⇒ UI/ASSIST. See `ios-source-map`.

## Run the gate
`node plugins/shipwithai-fixkit-ios/tests/run-all.js` (run from the repo root). Exit 0 = green. The
gate reuses core's `lib/ledger-validator.js` **and** `lib/handoff-validator.js` for its negative tests
— the single source of truth for bug state and the verification handoff (read-only; zero core edits).

## Conventions (BLOCKING in `tests/run-all.js`)
`SKILL.md` < 200 lines · max inline code block ≤ 20 lines · `description` < 200 chars · every skill
ends with `## What this … does NOT do` · ≥ 1 `user-invocable:false` sub-skill · ≥ 5 evals per skill
(≥ 3 trigger / ≥ 2 must-not) · 4-key version sync (`plugin.json` == per-plugin `marketplace.json`
top == `plugins[0]` == root marketplace ios entry).

## What this plugin does NOT do
- It ships **no** debugging logic, layer-agents, or orchestration — those are core's.
- It does not re-implement the ledger, the verification matrix, the handoff format, or any guard.
- It does not bind any MCP server in code; `CONNECTORS.md` declares the mappings, the host wires them.
- It does not auto-close a UI bug (no device/`~~browser`): UI is ASSIST → emit `handoff/v0` → candidate.
- It does not run the real Xcode/Swift bug gate — that is the deferred gate-run (needs a named target).
