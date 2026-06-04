---
name: kmp-reproduce
description: "KMP reproduce recipes: Logic = a failing JVM test in the shared module, written first; UI (ASSIST) = build + code-level diagnosis only, never observed. Internal: engine reproduce step."
version: 0.1.0
license: MIT
user-invocable: false
---

# kmp-reproduce — trigger the failure on a KMP tree

The KMP adapter's reproduce recipes. The engine (core's spine, REPRODUCE phase) calls these to trigger
a KMP failure **reliably** on the target from `kmp-environment`. Pick the recipe by the triaged symptom
layer. This adapter covers **Logic** (FULL) and **UI** (ASSIST — diagnose only); System reproduces via
the Gradle build/pipeline.

## Logic — a failing JVM test in the shared module (write it first)
Author the smallest test that asserts the intended `commonMain` behaviour; run it on the JVM via
`~~test-runner` so it **fails on the bug**. The failing run IS the reproduction (method analog:
`failing-test-passes` once green). A value wrong on **both** platforms points at shared logic.

```kotlin
// illustrative commonTest: assert the intended output; this FAILS on the bug
class GrossTest {
  @Test fun vatIsAPercentage() { assertEquals(220, gross(200, 10)) }
}
```

## UI (ASSIST) — build + code-level diagnosis only (do NOT claim to observe)
There is no device/`~~browser` connector, so the rendered Compose/SwiftUI result **cannot be
observed**. Reproduce by **building** the module and diagnosing from the bug report/screenshot and the
view code — hydrate the symptom, locate the suspect modifier/layout, and record the *intended*
observable. The agent must **NOT** assert it saw the running UI; that observation is deferred to a
verification provider (see `kmp-verify` → `handoff/v0`).

## System — reproduce through the Gradle build / pipeline
A build/dependency/config failure reproduces by running `./gradlew build` (or the failing CI job) and
reading the build output (method analog: `pipeline-run` / `ci-run`). The failing build IS the
reproduction.

## What this skill does NOT do
- It does not diagnose root cause or fix — it triggers and records the failure (core's spine does the rest).
- It does not pick which proof counts at close (core's `verification`) or stand up the env.
- It does not claim to observe a rendered UI; UI is ASSIST (build + diagnose, then hand off).
