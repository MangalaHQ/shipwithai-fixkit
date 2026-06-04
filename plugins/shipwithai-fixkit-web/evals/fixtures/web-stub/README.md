# web-stub (synthetic UI-geometry fixture — NOT a real adapter target)

This directory is **test scaffolding**, not a real web project. It is a zero-dependency, headless
stand-in for the live-DOM measurement a real `~~browser` would make, so this plugin's gate can run
a genuine reproduce → verify lifecycle without a browser.

It mirrors the web adapter's canonical **overflow** recipe (scrollWidth vs clientWidth):

- `buggy.js` — the **synthetic UI-geometry bug** in its FAILING form: `geometry()` returns
  `scrollWidth > clientWidth` (the content overflows its box).
- `fixed.js` — the **fix**: `geometry()` returns `scrollWidth <= clientWidth` (content fits).
- `reproduce.test.js` — asserts `scrollWidth <= clientWidth` against `buggy.js`; **fails (exit 1)**
  — that failing run is the reproduction.
- `verify.test.js` — asserts the same against `fixed.js`; **passes (exit 0)** — the verification
  evidence. Verification mirrors reproduction (same assertion, now true).

`tests/run-all.js` executes `reproduce.test.js` (asserts it fails) then `verify.test.js` (asserts
it passes). The lifecycle is demonstrated by running code, not asserted in prose.

## What this does NOT do
- It is not a real Astro project and drives no browser — the geometry is hard-coded, not measured.
- It does not exercise the Logic or System layers — only a single FULL-capability UI-geometry bug.
- It does not replace the live `~~browser` proof; it stands in for it deterministically in the gate.
