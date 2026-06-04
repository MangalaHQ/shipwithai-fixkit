# shipwithai-fixkit-web

The **thin web adapter** for the `shipwithai-fixkit-core` engine. It teaches the engine how to
reproduce, verify, and locate bugs on a concrete web stack (Astro + content-collections) without
re-implementing any of the engine itself.

## What it provides
- **Connector mappings** (`CONNECTORS.md`): `~~browser` → Claude in Chrome (alt: Playwright/
  Puppeteer MCP), `~~runtime` → `astro dev` on `localhost:4321` (alt: vite preview),
  `~~test-runner` → node/vitest, `~~ci` → GitHub Actions, `~~source control` → git/GitHub.
- **Capability declaration** (`lib/capability.json`): UI / Logic / System = FULL on this stack.
- **Four recipe skills:**
  - `web-environment` (user-invocable) — stand up / locate the runnable target; cache discipline.
  - `web-reproduce` (sub-skill) — per-layer reproduce recipes.
  - `web-verify` (sub-skill) — verify recipes mirroring reproduce; handoff/v0 when no browser.
  - `web-source-map` (sub-skill) — symptom → file hints on the Astro stack.

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
lifecycle, the capability declaration, the convention linters, and the 4-key version sync. Run it
from the repo root. Exit 0 = green.

## Scope
A Phase-1 adapter. It maps connectors and ships recipes; it does **not** ship debugging logic,
layer-agents, or orchestration (those are core). The `evals/fixtures/web-stub` is synthetic test
scaffolding, not a real adapter target.

## License
MIT.
