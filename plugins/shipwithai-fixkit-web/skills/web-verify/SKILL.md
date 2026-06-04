---
name: web-verify
description: "Web verify recipes that mirror reproduce; when ~~browser is absent emit handoff/v0 with a UI LAYER_METHODS proof. Used internally by the engine's verify step on a web bug."
version: 0.1.0
license: MIT
user-invocable: false
---

# web-verify — prove the fix by re-running the reproduction

The web adapter's verify recipes. **Verification mirrors reproduction:** each recipe here re-runs
the *same observation* `web-reproduce` used to trigger the failure — same target, same element,
same measurement — now asserting the fixed result. A bug reproduced by `scrollWidth` is verified by
`scrollWidth`, never by a source diff (core enforces this with `VERIFICATION_LAYER_MISMATCH`).

UI proof methods MUST be UI `LAYER_METHODS`: `browser-assertion`, `computed-style`,
`dom-assertion`, `console-assertion`, `interaction-assertion`.

## UI — layout / overflow (mirrors scrollWidth vs clientWidth)
```js
const el = document.querySelector('pre');
// verified when scrollWidth <= clientWidth at the failing widths (no overflow)
console.assert(el.scrollWidth <= el.clientWidth, 'overflow fixed');
```
Method: `computed-style` / `dom-assertion`. Record the observed numbers as `verification.evidence`.

## UI — visual (mirrors computed-style read)
Re-read `getComputedStyle` on the same element; assert the value now matches intent. Method:
`computed-style`.

## UI — client-runtime (mirrors console read)
Reload/interact and assert the previously-seen console error is **gone**. Method:
`console-assertion`.

## UI — interaction (mirrors interaction + state assertion)
Re-drive the same interaction; assert the expected state change now happens. Method:
`interaction-assertion`.

## UI — responsive (mirrors the viewport / resize matrix)
Re-sweep the same widths (e.g. 1280 / 768 / 375); assert the measurement passes at **every** width
that previously failed. Method: `browser-assertion` over the matrix.

## When ~~browser is absent → emit handoff/v0
UI FULL requires `~~browser`. Without it the layer is **ASSIST**: do **not** auto-close. Emit a
`handoff/v0` (core `lib/handoff.schema.md`) so a provider who *can* observe runs the proof. Set the
target URL on 4321, the mirrored steps, and a UI-`LAYER_METHODS` assertion; leave `verified_by:
null`. The ledger stops at `candidate` until a provider fills it.

```json
{
  "version": "handoff/v0", "bug_id": "BUG-XXXX", "symptom_layer": "UI",
  "target": { "env": "local-dev", "url": "http://localhost:4321/blog/x", "viewport": "1280x800" },
  "steps": ["open the URL", "select the <pre>", "read scrollWidth and clientWidth"],
  "assertion": { "method": "computed-style", "expected": "scrollWidth <= clientWidth at 1280/768/375" },
  "verified_by": null
}
```

## Logic / System
Logic verifies when the failing test passes + suite green (`~~test-runner`). System verifies on
green pipeline + correct boundary logs (`~~ci`). These follow core's matrix unchanged.

## What this does NOT do
- It does not fix the bug or run the proof itself — the layer-agent does; this names the proof.
- It does not close the ledger (core's integrity rule does) or weaken the ASSIST ceiling.
- It does not invent a proof method outside the layer's `LAYER_METHODS`, and never closes UI on a diff.
