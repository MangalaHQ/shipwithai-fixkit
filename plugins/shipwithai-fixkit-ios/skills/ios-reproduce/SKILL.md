---
name: ios-reproduce
description: "iOS reproduce recipes: Logic = a failing host-runnable unit test, written first; UI (ASSIST) = build + code-level diagnosis only, never observed on a device. Internal: engine reproduce step."
version: 0.1.0
license: MIT
user-invocable: false
---

# ios-reproduce — trigger the failure the way the layer is proven

The iOS adapter's reproduce recipes. **Reproduction sets up the observation that verification will
mirror** (doc 09 §7). Each layer reproduces the way it will later be proven: Logic by a failing
host-runnable test; UI by build + diagnosis only (the render is unobserved — ASSIST).

## Logic — a failing host-runnable unit test, written first
App/business logic runs on the macOS host via `~~test-runner`. Write the test that asserts the
*correct* behaviour and watch it **fail** against the current code — that failing run **is** the
reproduction (method analog `failing-test-passes` once green). Keep it a unit/logic test so no
simulator UI is needed; the agent observes the test result, not a render.

```bash
swift test --filter TipTotalTests   # the new test FAILS — the reproduction (SwiftPM, macOS host)
```

## System — reproduce the build/dependency/config failure on the host
A build / dependency / config bug is reproduced by running the build and reading the failure
(`xcodebuild build`, SwiftPM resolution, or the CI job). The failing build output is the reproduction;
the boundary is host-observable, so the layer is FULL.

## UI (ASSIST) — build + code-level diagnosis only (never an observed render)
A SwiftUI/UIKit symptom renders on a device the adapter cannot observe. **Do not claim to have seen
the running UI.** Build the app and diagnose at the code level — hydrate the symptom from the bug
report/screenshot the reporter supplied, locate the suspect view/modifier, and form a root-cause
hypothesis. The *observation* is deferred to a provider via the handoff (see `ios-verify`).

## Mirror discipline
Whatever you reproduce with here is what `ios-verify` must re-observe: a failing test → the test
passing; a build failure → a green build; an unobserved UI symptom → a `handoff/v0` for a provider.
Never substitute a source diff for the missing observation.

## What this skill does NOT do
- It does not observe a running simulator/device render — UI is ASSIST (build + diagnose only).
- It does not verify or close the bug; that is `ios-verify` + core's integrity rule.
- It does not invent a proof outside the layer's `LAYER_METHODS`, and never reproduces a UI bug by diff.
