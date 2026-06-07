# shipwithai-fixkit-web-harness

The **in-loop `~~browser` binding** for the [ShipWithAI Fixkit](https://github.com/shipwithai/shipwithai-fixkit)
bug-fix engine: a thin headless **Playwright** runner that lets the engine REPRODUCE and VERIFY
front-end **UI** bugs *itself* — so a UI bug closes autonomously at `capability_tier: FULL` instead
of capping at `candidate` behind a human-driven browser.

## What it does
`lib/drive.js` navigates a live target and takes one in-page observation, emitting a single JSON line
`{ method, ok, evidence }` where `method` is one of the five UI `LAYER_METHODS` the core validator
recognises and `evidence` is the **observed numbers** (so the close proof is non-circular):

| Measure | Method | Observation |
|---|---|---|
| `overflow` | `dom-assertion` | `scrollWidth` vs `clientWidth` |
| `computed-style` | `computed-style` | `getComputedStyle(el)[prop]` |
| `console` | `console-assertion` | console errors/warnings on load |
| `interaction` | `interaction-assertion` | post-click DOM/state |
| `viewport` | `browser-assertion` | overflow across the width matrix |

`ok:false` = bug present (REPRODUCE); `ok:true` = fixed (VERIFY). See `skills/browser-drive/SKILL.md`
for the full CLI contract.

## Install the prerequisite
Playwright is a **prerequisite**, not a vendored dependency:

```
npx playwright install chromium
```

## Run the gate
```
node plugins/shipwithai-fixkit-web-harness/tests/run-all.js
```
Tier A (quality limits, version sync, the `measures.js` unit test, and the cross-plugin contract
test against core's validator) is zero-dependency and always runs. Tier B (the live Playwright
smoke) runs when Playwright is installed and SKIPs cleanly otherwise.

## Scope
Pure mechanism. It does not classify bugs, pick the proof, edit source, or orchestrate — the core
engine does that. It is the connector; the engine is the loop.

## License
MIT © ShipWithAI.
