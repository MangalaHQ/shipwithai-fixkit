# backend-stub-logic — synthetic Logic fixture (test scaffolding, NOT a real target)

A deterministic off-by-one in `sumRange(n)` (should be `1+…+n`). It exercises the engine's
**Logic** loop without a real backend: `reproduce.test.js` fails against `buggy.js` (the failing
test IS the reproduction); `verify.test.js` passes against `fixed.js` (proof method
`failing-test-passes`). Verification mirrors reproduction — the same assertion, now green.
Run via `node <file>` exit code; wired into `tests/run-all.js` section 1.
