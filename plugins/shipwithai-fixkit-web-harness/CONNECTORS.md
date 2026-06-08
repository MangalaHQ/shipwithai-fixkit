# Connectors — web-harness binding

This plugin **is** the concrete `~~browser` connector for the fixkit engine. Where an adapter's
`CONNECTORS.md` maps the `~~browser` placeholder to this harness, the engine resolves UI
observations to the headless Playwright runner `lib/drive.js` — **in-loop, auto-closing**, no human
in the inner loop. Composed **by convention** (slash-path reference + a `user-invocable:false`
sub-skill), never by `plugin.json` dependency wiring.

| Placeholder | This plugin provides | How |
|---|---|---|
| `~~browser` | **primary** — headless Playwright runner | `node plugins/shipwithai-fixkit-web-harness/lib/drive.js --url <url> --measure <type> [opts]` → one JSON line `{ method, ok, evidence }` |

## What `~~browser` resolves to here
The runner observes a live target (stood up by the adapter's `~~runtime`, e.g. `astro dev :4321`)
and emits exactly one of the five UI `LAYER_METHODS` with the **observed numbers** as evidence:

| Measure | UI `LAYER_METHODS` method | Observation |
|---|---|---|
| `overflow` | `dom-assertion` | `scrollWidth` vs `clientWidth` |
| `computed-style` | `computed-style` | `getComputedStyle(el)[prop]` |
| `console` | `console-assertion` | console errors/warnings on load |
| `interaction` | `interaction-assertion` | post-click DOM/state |
| `viewport` | `browser-assertion` | overflow across the width matrix |

See `skills/browser-drive/SKILL.md` for the full CLI contract and examples.

## Prerequisite
Playwright is a **documented prerequisite**, not a vendored or manifest-declared dependency:
`npx playwright install chromium`. When it is absent the runner exits non-zero with
`{ ok:false, error }`; the consuming adapter then falls back per its own `## If ~~browser NOT
Available` rule (UI → ASSIST → `handoff/v0`). See `CLAUDE.md` for the config profile.

## What this does NOT do
- It does not classify bugs, pick the proof method, edit source, or orchestrate — core's
  `triage` / `verification` / layer-agents do that; this is pure observation mechanism.
- It does not stand up the dev server (the adapter's `~~runtime` does) or close the ledger
  (core's integrity rule does).
- It does not bind itself in code to any adapter — an adapter's `CONNECTORS.md` points `~~browser`
  here by convention; this file only declares what the binding provides.
