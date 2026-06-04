# kmp-stub-logic — synthetic shared-logic fixture (test scaffolding, NOT a real target)

A deterministic VAT bug in `gross(net, vatPercent)` (should be `net + round(net*vatPercent/100)`;
the bug adds the percent as a flat amount). It simulates a `commonMain` function consumed by both
Android and iOS, so the wrong value shows on **both** platforms ⇒ a **shared-logic** root cause
(source-map rule). It exercises the engine's **Logic** loop without a real Gradle/JVM toolchain:
`reproduce.test.js` fails against `buggy.js` (the failing test IS the reproduction); `verify.test.js`
passes against `fixed.js` (proof method `failing-test-passes`). Verification mirrors reproduction —
the same assertion, now green. Run via `node <file>` exit code; wired into `tests/run-all.js`
section 1. Real `./gradlew :shared:test` proof is the deferred gate-run.
