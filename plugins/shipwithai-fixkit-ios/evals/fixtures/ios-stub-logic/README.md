# ios-stub-logic — the FULL host-runnable logic lane (deterministic Node stub)

A synthetic pure business-logic bug consumed by a SwiftUI view model, simulating the Logic layer the
iOS adapter declares **FULL**. On a real project this runs + reports on the macOS host via
`swift test` (SwiftPM) or the unit/logic bundles of `xcodebuild test`; here it is zero-dependency
Node so the gate stays hermetic.

- `buggy.js` — `totalWithTipCents(5000, 18)` returns `5018` (flat add bug; expected `5900`).
- `fixed.js` — applies the percentage correctly.
- `reproduce.test.js` — asserts the expected `5900` against `buggy.js` → **fails** (the reproduction).
- `verify.test.js` — the same assertion + edges against `fixed.js` → **passes** (`failing-test-passes`).

The gate (`tests/run-all.js` §1) asserts reproduce FAILS on buggy and verify PASSES on fixed; the
mutation check (§4 M2) reruns reproduce against `fixed.js` and asserts it PASSES — proving the
reproduction is buggy-specific, not a vacuous always-throw.

This is **not** a real adapter run. The real Xcode/Swift bug is the deferred gate-run (needs a target).
The FULL claim is gated on the declared macOS + Xcode host precondition (see `lib/capability.json`).
