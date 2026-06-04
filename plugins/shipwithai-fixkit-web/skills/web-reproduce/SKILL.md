---
name: web-reproduce
description: "Web reproduce recipes per layer/subtype: computed-style read, scrollWidth vs clientWidth, console read, interaction+state assertion, viewport/resize matrix. Internal: engine reproduce step."
version: 0.1.0
license: MIT
user-invocable: false
---

# web-reproduce — trigger the failure on the live web target

The web adapter's reproduce recipes. The engine (core's spine, REPRODUCE phase) calls these to
trigger a web failure **reliably** on the live target from `web-environment`. Each recipe yields
an observation whose result IS the reproduction; `web-verify` later re-runs the same observation.

Pick the recipe by the triaged symptom layer + subtype. All UI recipes run through `~~browser`.

## UI — visual / styling (computed-style read)
Read the rendered style of the offending element and show it disagrees with intent.

```js
const el = document.querySelector('pre code'); // the symptom element
const cs = getComputedStyle(el);
// reproduced: the observed value disagrees with the design intent
console.log(cs.whiteSpace, cs.overflowX, cs.fontSize);
```

## UI — layout / overflow (scrollWidth vs clientWidth)
The canonical overflow check. Overflow exists when content is wider than its box.

```js
const el = document.querySelector('pre'); // or the overflowing container
// reproduced when scrollWidth > clientWidth (content overflows its box)
console.log(el.scrollWidth, el.clientWidth, el.scrollWidth > el.clientWidth);
```

## UI — client-runtime (console read)
Capture console errors/warnings emitted on load or interaction (e.g. hydration errors, "storage
not allowed"). The presence of the expected error message is the reproduction.

```js
const seen = [];
['error', 'warn'].forEach((k) => { const o = console[k]; console[k] = (...a) => { seen.push(a.join(' ')); o(...a); }; });
// reload / interact, then inspect `seen` for the expected message
```

## UI — interaction / behavior (interaction + state assertion)
Drive the interaction, then assert the resulting DOM/state. A dead control reproduces when the
post-interaction state is unchanged.

```js
document.querySelector('[data-save]').click();
// reproduced when the expected state change did NOT happen
console.log(document.querySelector('[data-status]')?.textContent);
```

## UI — responsive (viewport / resize matrix)
Sweep widths and re-run the relevant measurement at each. The bug reproduces at the widths where
the assertion fails.

```js
for (const w of [1280, 768, 375]) {
  // resize the viewport to w (via ~~browser), then re-measure the symptom element
  // record per-width: scrollWidth/clientWidth or computed-style — note which widths fail
}
```

## Logic / System
Logic reproduces via a failing automated test (`~~test-runner`: node/vitest). System reproduces in
the failing env with instrumented boundaries (`~~ci` / shell). These follow core's matrix; the web
adapter adds no new Logic/System recipe beyond running the stack's tests.

## What this does NOT do
- It does not diagnose or fix — it only triggers and records the failure (core's spine does the rest).
- It does not pick which proof counts at close (core's `verification` does) or stand up the server.
- It does not classify the bug (core's `triage`) or locate the file (see `web-source-map`).
