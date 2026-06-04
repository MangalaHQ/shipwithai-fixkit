# backend-stub-integration — synthetic System/integration fixture (scaffolding, NOT real)

A deterministic boundary bug: a handler that fails to normalize a trailing slash, so the
**instrumented boundary log** records the wrong `normalizedPath`. It exercises the engine's
**System** loop without a real backend: `reproduce.test.js` instruments the boundary and fails
against `buggy.js`; `verify.test.js` re-runs the same boundary assertion against `fixed.js` and
passes (proof method `instrumented-boundary`). Wired into `tests/run-all.js` section 2.
