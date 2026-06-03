# stub-adapter (test fixture — NOT a real adapter)

This directory is **test scaffolding**, not a shipped adapter plugin. It simulates what a real
platform adapter provides for the happy-path eval, as a genuinely runnable lifecycle:

- `buggy.js` — the **synthetic Logic bug** in its FAILING form (`sum()` accumulator seeded at 1).
- `fixed.js` — the **fix** (smallest change: accumulator seeded at 0).
- `reproduce.test.js` — runs the expected behaviour against `buggy.js`; **fails (exit 1)** — the
  reproduction.
- `verify.test.js` — runs the expected behaviour against `fixed.js`; **passes (exit 0)** — the
  verification evidence (and the regression guard).

`tests/run-all.js` (acceptance check #1) actually executes `reproduce.test.js` (asserts it fails)
then `verify.test.js` (asserts it passes), then validates that the resulting ledger
(`../ledger/happy-path.closed.md`) reaches `closed`. The lifecycle is demonstrated by running
code, not asserted in prose.

Phase 0 builds **no** real adapters (web/backend/kmp/android/ios). Those are Phase 1+.

## What this does NOT do

- It is not installed as a plugin and exposes no skills, agents, or connectors.
- It does not model UI or System layers — only a single FULL-capability Logic bug.
- It does not drive the orchestrator end-to-end; it provides the runnable artifact the
  happy-path ledger closes on.
