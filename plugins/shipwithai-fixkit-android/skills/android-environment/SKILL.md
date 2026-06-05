---
name: android-environment
description: "Locate the Gradle wrapper + JDK and enforce build hygiene: confirm the debug unit-test task, kill stale daemons, clean state. Triggers: 'set up the Android build', 'kill the Gradle daemon'."
version: 0.1.0
license: MIT
user-invocable: true
---

# android-environment — stand up + clean the Android host loop

The Android adapter's environment recipe. Before reproduce/verify can run, the **host JVM loop** must
be locatable and clean. This skill finds the toolchain and enforces build hygiene so a failing test is
a real signal, not a stale-daemon artifact. It does **not** stand up a device — that runtime is
unobserved (UI = ASSIST).

## Locate the toolchain
- Find the Gradle wrapper (`./gradlew` at the project root) and the JDK it targets (`./gradlew
  --version`). Prefer the wrapper over a system Gradle so the version matches the project.
- Confirm the **host-JVM unit-test task** exists: `./gradlew tasks --all | grep testDebugUnitTest`
  (or the module-qualified `:app:testDebugUnitTest`). This task is what makes **Logic FULL** — it runs
  on the JVM, no device required.

## Build hygiene (so a red test means a real bug)
- Kill stale daemons before a clean run: `./gradlew --stop`, then run with `--no-daemon` when in doubt.
- Clear stale build output: `./gradlew clean` removes `build/` so a cached class can't mask a fix.
- Pin the canonical config (build variant `debug`, the module under test) so reproduce and verify
  observe the *same* target.

```bash
./gradlew --stop                       # kill stale daemons
./gradlew clean testDebugUnitTest --no-daemon   # clean host-JVM unit-test run
```

## What this confirms before reproduce/verify
- `~~test-runner` is reachable (`testDebugUnitTest` runs) → Logic FULL is honest.
- `~~ci` / a local `./gradlew build` is reachable → System FULL is honest.
- **No device connector** → UI stays ASSIST; do not attempt to observe a render here.

## What this skill does NOT do
- It does not stand up or observe an emulator/device — that runtime is unwired (UI = ASSIST).
- It does not fix bugs, write tests, or emit a handoff — those are reproduce/verify.
- It does not declare capability tiers (that is `lib/capability.json`) or wire any MCP connector.
