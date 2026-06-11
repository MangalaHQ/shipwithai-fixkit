# shipwithai-fixkit-web

The **thin web adapter** for the `shipwithai-fixkit-core` engine. It teaches the engine how to
reproduce, verify, and locate bugs on a concrete web stack (Astro + content-collections) without
re-implementing any of the engine itself.

## What it provides
- **Connector mappings** (`CONNECTORS.md`): `~~browser` → the **bundled headless Playwright
  runner** (`lib/drive.js`, in-loop; Claude in Chrome is a final spot-check), `~~runtime` →
  `astro dev` on `localhost:4321` (alt: vite preview), `~~test-runner` → node/vitest,
  `~~ci` → GitHub Actions, `~~source control` → git/GitHub.
- **Capability declaration** (`lib/capability.json`): UI / Logic / System = FULL on this stack.
- **Six skills:**
  - `web-environment` (user-invocable) — stand up / locate the runnable target; cache discipline.
  - `astro-recipes` (user-invocable) — generic Astro UI-render fix patterns.
  - `web-reproduce` (sub-skill) — per-layer reproduce recipes.
  - `web-verify` (sub-skill) — verify recipes mirroring reproduce; handoff/v0 when no browser.
  - `web-source-map` (sub-skill) — symptom → file hints on the Astro stack.
  - `browser-drive` (sub-skill) — the bundled runner's CLI contract.

## The bundled browser runner
`lib/drive.js` (merged from the standalone harness plugin in 0.3.0) navigates a live target, takes
one in-page observation, and emits a single JSON line `{ method, ok, evidence }` where `method` is
one of the five UI `LAYER_METHODS` the core validator recognises and `evidence` is the **observed
numbers** — so a UI bug closes autonomously at `capability_tier: FULL` on a live measurement,
never a source diff. Six measures map onto the five methods:

| Measure | Method | Observation |
|---|---|---|
| `overflow` | `dom-assertion` | `scrollWidth` vs `clientWidth` |
| `computed-style` | `computed-style` | `getComputedStyle(el)[prop]` |
| `console` | `console-assertion` | console errors/warnings on load |
| `interaction` | `interaction-assertion` | post-click DOM/state |
| `scroll-read-state` | `interaction-assertion` | post-scroll state (scroll-spy proof) |
| `viewport` | `browser-assertion` | overflow across the width matrix |

**Prerequisite (not vendored):** in the target project, `npm install -D playwright` then
`npx playwright install chromium` — the runner resolves `playwright` from the invoking cwd.

## How it composes
By **convention**, never by `plugin.json` dependency wiring. Core's orchestrator resolves the
`~~connector` placeholders against this adapter's `CONNECTORS.md`, reads `lib/capability.json` for
the tier, and runs the matching recipe for the symptom layer.

## Capability + the ASSIST downgrade
UI FULL **requires `~~browser`**. When it is absent, the UI layer downgrades to ASSIST:
`web-verify` emits a `handoff/v0` (core `lib/handoff.schema.md`) with a UI `LAYER_METHODS` proof,
and the ledger stops at `candidate`.

## Develop
`node tests/run-all.js` runs this plugin's own blocking gate: the `web-stub` computed-geometry
lifecycle, the capability declaration, the `measures.js` unit test (methods pinned against core's
validator), the cross-plugin contract test, the convention linters, and the 4-key version sync —
plus a conditional Tier-B Playwright smoke that SKIPs cleanly when Playwright is absent (the green
never depends on it). Run it from the repo root. Exit 0 = green.

## Scope
A Phase-1 adapter. It maps connectors and ships recipes; it does **not** ship debugging logic,
layer-agents, or orchestration (those are core). The `evals/fixtures/web-stub` is synthetic test
scaffolding, not a real adapter target.

## License
MIT.
