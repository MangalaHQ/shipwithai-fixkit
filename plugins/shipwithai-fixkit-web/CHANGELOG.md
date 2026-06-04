# Changelog — shipwithai-fixkit-web

## [0.1.0] — 2026-06-04

### Added
- **Thin web adapter** for `shipwithai-fixkit-core` (design-doc 09 §9: mappings + recipes +
  declarations only — no debugging logic, no layer-agents, no orchestration).
- **Connector mappings** (`CONNECTORS.md`) via the `## If <connector> Available` idiom:
  `~~browser` → Claude in Chrome (alt: Playwright/Puppeteer MCP), `~~runtime` → `astro dev` on
  `localhost:4321` (alt: vite preview), `~~test-runner` → node/vitest, `~~ci` → GitHub Actions,
  `~~source control` → git/GitHub. UI FULL requires `~~browser`; absent it the layer downgrades to
  ASSIST and `web-verify` emits `handoff/v0`.
- **Capability declaration** `lib/capability.json` — UI / Logic / System = FULL on the Astro stack.
- **Four recipe skills:** `web-environment` (user-invocable), and the `user-invocable:false`
  sub-skills `web-reproduce`, `web-verify` (mirrors reproduce; handoff/v0 fallback), and
  `web-source-map` (symptom → file hints on Astro + content-collections).
- **Synthetic gate fixture** `evals/fixtures/web-stub` — a zero-dependency, headless
  computed-geometry proof pair (`buggy.js` scrollWidth > clientWidth; `fixed.js` scrollWidth <=
  clientWidth) with reproduce(fails)/verify(passes) tests.
- **Deterministic gate** `tests/run-all.js` (+ vendored zero-dep `tests/lib/frontmatter.js`): runs
  the web-stub lifecycle, asserts the capability declaration, runs the convention linters over this
  plugin's skills, and checks the 4-key version sync.

### Notes
- An adapter composes by **convention**, never by `plugin.json` dependency wiring.
- The `web-stub` fixture is test scaffolding, not a real adapter target (no real Astro project).
