# android-stub-logic — the FULL shared-logic lane (deterministic Node stub)

A synthetic pure business-logic bug consumed by a ViewModel, simulating the Logic layer the Android
adapter declares **FULL**. On a real project this runs on the host JVM via
`./gradlew testDebugUnitTest`; here it is zero-dependency Node so the gate stays hermetic.

- `buggy.js` — `discountedCents(2000, 10)` returns `1990` (flat subtract bug; expected `1800`).
- `fixed.js` — applies the percentage correctly.
- `reproduce.test.js` — asserts the expected `1800` against `buggy.js` → **fails** (the reproduction).
- `verify.test.js` — the same assertion + edges against `fixed.js` → **passes** (`failing-test-passes`).

The gate (`tests/run-all.js` §1) asserts reproduce FAILS on buggy and verify PASSES on fixed; the
mutation check (§4 M2) reruns reproduce against `fixed.js` and asserts it PASSES — proving the
reproduction is buggy-specific, not a vacuous always-throw.

This is **not** a real adapter run. The real Gradle/JVM bug is the deferred gate-run (needs a target).
