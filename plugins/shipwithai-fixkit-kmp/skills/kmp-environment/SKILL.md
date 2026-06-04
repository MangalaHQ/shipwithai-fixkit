---
name: kmp-environment
description: "Locate the Gradle wrapper + JVM and enforce build hygiene before reproduce: confirm the shared test task, clean build state, kill stale daemons. Internal: engine environment step."
version: 0.1.0
license: MIT
user-invocable: true
---

# kmp-environment — make the KMP build runnable and clean

The KMP adapter's environment skill. The engine (core's spine) calls this to get a **runnable, clean**
JVM target before REPRODUCE. It locates the Gradle wrapper via `~~runtime` and removes the state that
makes KMP builds flaky. It ships no debugging logic.

## Locate the build + the shared test task (`~~runtime` / `~~test-runner`)
Find the Gradle wrapper (`./gradlew`, `gradlew.bat`) and the JVM (a compatible JDK on `JAVA_HOME`).
Confirm the **shared module's JVM test task exists** (`./gradlew :shared:test` or the project's
equivalent) — that task is what makes the Logic layer runnable. Prefer the smallest runnable surface
that reproduces the bug (the shared module's JVM tests over a full multiplatform build).

## Build hygiene (the KMP equivalent of cache discipline)
- **JDK:** confirm a compatible JDK is on `JAVA_HOME`; mismatched toolchains fake build failures.
- **Daemons:** kill stale Gradle daemons before a clean run so a cached classpath can't fake a pass.
- **State:** start from a clean build dir (`--no-daemon` + `clean`) when a stale artifact is suspected.
- **Lockfiles:** confirm the dependency lock is consistent before chasing a "dependency" symptom.

```bash
# illustrative hygiene sweep (adapt per project; ~~runtime supplies the concrete commands)
./gradlew --stop                       # kill stale daemons
./gradlew --no-daemon clean :shared:test --dry-run   # confirm the shared test task resolves
```

## If ~~runtime Available
Resolve the Gradle wrapper + JDK and confirm the shared test task. Without a wrapper, fall back to a
system Gradle and note in the ledger that toolchain drift may affect reproduction.

## Platform runtime is out of reach
This skill makes the **JVM** runnable (shared logic + Gradle build). It does **not** stand up an
Android/iOS device or simulator — that platform runtime has no connector, which is why UI is ASSIST.

## What this skill does NOT do
- It does not reproduce, diagnose, fix, or verify — it only makes the JVM target runnable and clean.
- It does not classify the bug (core's `triage`) or map symptom→file (see `kmp-source-map`).
- It does not stand up an Android/iOS device; the platform runtime is unobservable here (UI = ASSIST).
