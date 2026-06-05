# Connectors — Android adapter mappings

Core references capabilities by `~~category` placeholder (see core `CONNECTORS.md`). This adapter
maps each placeholder to a concrete **Android / Gradle tool** with alternatives. The `## If
<connector> Available` idiom lets a recipe upgrade when the connector is present and degrade
gracefully when it is absent.

| Placeholder | Android tool (primary) | Alternatives |
|---|---|---|
| `~~test-runner` | `./gradlew testDebugUnitTest` (host JVM) | `gradlew test`, JUnit, Robolectric |
| `~~ci` | GitHub Actions | local `./gradlew build` |
| `~~runtime` | **Gradle / host JVM** (app/business logic runs here) | — *the emulator/device runtime is what the agent cannot observe* |
| `~~source control` | git + GitHub | local `git` |

**There is no `~~browser` and no device/emulator connector.** That absence is *exactly why UI =
ASSIST*: the agent can build and diagnose Compose/View code but cannot observe the rendered result on
a device.

## If ~~test-runner Available
Run the Logic proof via `./gradlew testDebugUnitTest` (or JUnit/Robolectric). The previously-failing
unit test passing + the suite green is what makes **Logic FULL** on host-JVM app/business logic.

## If ~~ci Available
Run / read the System proof through the pipeline (GitHub Actions): a green build of the Gradle
project is part of the System proof (`pipeline-run` / `ci-run`). Without it, fall back to a local
`./gradlew build` and read the build output directly. Observing the build is what makes **System FULL**.

## If ~~runtime Available
Stand up the host JVM for unit tests (see `android-environment`). The JVM is the only runtime this
adapter can observe; the **device/emulator** runtime is **not** wired — UI behaviour there is
verified by a provider via `handoff/v0`, not by this adapter.

## If a device / ~~browser were Available (it is NOT here)
UI would upgrade toward FULL. Absent it, the UI layer is **ASSIST**: `android-verify` does **not**
auto-close. It emits a `handoff/v0` (core `lib/handoff.schema.md`) carrying the target device/viewport,
the steps, and a UI `LAYER_METHODS` assertion for a provider (Cowork, a device farm, a CI snapshot,
or a human) to observe. `verified_by` stays `null`; the ledger stops at `candidate`.

## If ~~source control Available
Use git + GitHub for diffs and history. A bug is **never** closed on a source diff alone — the diff
locates the change; the JVM test (Logic), build/pipeline (System), or filled handoff (UI) confirms it.

## What this does NOT do
- It does not bind any MCP server in code — the host wires the concrete connector; this file declares
  the mapping only.
- It does not grant a capability tier on its own; `lib/capability.json` declares the tiers (UI ASSIST,
  Logic/System FULL) and the no-device fact that pins UI at ASSIST.
- It does not re-implement the ledger, the verification matrix, the handoff format, or any guard —
  those are core's (`lib/ledger-validator.js`, `lib/handoff.schema.md`).
