# Connectors — iOS adapter mappings

Core references capabilities by `~~category` placeholder (see core `CONNECTORS.md`). This adapter
maps each placeholder to a concrete **Xcode / Swift tool** with alternatives. The `## If <connector>
Available` idiom lets a recipe upgrade when the connector is present and degrade gracefully when it is
absent.

> **Host precondition:** this adapter's FULL claims require a **macOS host with the Xcode / Swift
> toolchain**. The unit-test and build loops run on that host. Off a macOS host, treat the host loop
> as unavailable and fall back accordingly. The asymmetry with Android (which runs on any JVM host) is
> a host requirement, not a tier downgrade.

| Placeholder | iOS tool (primary) | Alternatives |
|---|---|---|
| `~~test-runner` | `swift test` / `xcodebuild test` (**macOS host required**) | SwiftPM, XCTest |
| `~~ci` | GitHub Actions (**macOS runner**) | local `xcodebuild` |
| `~~runtime` | **macOS host / Swift toolchain** (host-runnable logic + build run here) | — *the simulator/device runtime is what the agent cannot observe* |
| `~~source control` | git + GitHub | local `git` |

**There is no `~~browser` and no simulator/device connector.** That absence is *exactly why UI =
ASSIST*: the agent can build and diagnose SwiftUI/UIKit code but cannot observe the rendered result on
a device.

## If ~~test-runner Available
Run the Logic proof via `swift test` (SwiftPM) or the unit/logic bundles of `xcodebuild test`. The
agent observes the **test result** (pass/fail), not a render — the previously-failing unit test
passing + the suite green is what makes **Logic FULL** on the macOS host.

## If ~~ci Available
Run / read the System proof through the pipeline (GitHub Actions on a macOS runner): a green build of
the project is part of the System proof (`pipeline-run` / `ci-run`). Without it, fall back to a local
`xcodebuild build` and read the build output directly. Observing the build is what makes **System FULL**.

## If ~~runtime Available
Stand up the macOS host / Swift toolchain for unit tests + build (see `ios-environment`). That host is
the only runtime this adapter can observe; the **simulator/device** runtime is **not** wired — UI
behaviour there is verified by a provider via `handoff/v0`, not by this adapter.

## If a device / ~~browser were Available (it is NOT here)
UI would upgrade toward FULL. Absent it, the UI layer is **ASSIST**: `ios-verify` does **not**
auto-close. It emits a `handoff/v0` (core `lib/handoff.schema.md`) carrying the target device/viewport,
the steps, and a UI `LAYER_METHODS` assertion for a provider (Cowork, a device farm, a CI snapshot, or
a human) to observe. `verified_by` stays `null`; the ledger stops at `candidate`.

## If ~~source control Available
Use git + GitHub for diffs and history. A bug is **never** closed on a source diff alone — the diff
locates the change; the host test (Logic), build/pipeline (System), or filled handoff (UI) confirms it.

## What this does NOT do
- It does not bind any MCP server in code — the host wires the concrete connector; this file declares
  the mapping only.
- It does not grant a capability tier on its own; `lib/capability.json` declares the tiers (UI ASSIST,
  Logic/System FULL on a macOS host) and the no-device fact that pins UI at ASSIST.
- It does not re-implement the ledger, the verification matrix, the handoff format, or any guard —
  those are core's (`lib/ledger-validator.js`, `lib/handoff.schema.md`).
