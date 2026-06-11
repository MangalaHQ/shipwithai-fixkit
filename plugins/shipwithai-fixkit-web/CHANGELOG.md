# Changelog — shipwithai-fixkit-web

## [0.3.0] — 2026-06-11

### Added
- **The standalone `shipwithai-fixkit-web-harness` plugin was folded into this adapter** (Ethan's
  ruling: the harness is always co-installed with the web adapter, so the split carried no
  operational value). The adapter now bundles the in-loop `~~browser` binding: `lib/drive.js`
  (headless Playwright runner), `lib/measures.js` (the 6 pure shaping helpers → 5 UI
  `LAYER_METHODS`), the `user-invocable:false` sub-skill `browser-drive`, and the smoke-page +
  cross-plugin contract fixtures. The harness gate merged into `tests/run-all.js` with **zero
  checks dropped** (combined deterministic gate: 75 checks). Users who installed
  `shipwithai-fixkit-web-harness` should uninstall it; this plugin contains the runner now.
  Measures and `LAYER_METHOD` codes are unchanged (ledger compatibility).

### Fixed
- **(a) wrong-org repository URLs** in web-scope files: the GitHub repository links now point at
  the `MangalaHQ` org (plugin.json `repository`; the merged runner docs).
- **(b) `drive.js` resolves `playwright` from the target project's cwd**
  (`require.resolve('playwright', { paths: [process.cwd()] })`, cwd tried FIRST), with a clear
  install message when absent — killing the `NODE_PATH` remediation in `docs/QUICKSTART-FE.md`.
  Tests-first: three new gate checks (stub-resolution bite, resolution-source + ordering
  assertion, error-message contract) were shown RED against the old behavior before the fix.

## [0.2.1] — 2026-06-10

### Fixed
- **`fix(astro-recipes)`: the Overflow recipe verifies on the page root, not the `<pre>`.** A real-browser
  gate-run showed `overflow-x:auto` is the correct fix (the code keeps its own horizontal scroll, no
  wrap) but it *contains* the overflow — the `<pre>` itself stays `scrollWidth > clientWidth` by design,
  so verifying on `--selector 'pre'` could never go green. The recipe now reproduces/verifies the
  `overflow` measure on the **page root** (`--selector 'body'`): REPRODUCE `ok:false` (page overflows),
  VERIFY `ok:true` (contained). Recipe text + the recipe-index row + one eval (`astro-recipes-03`)
  updated. **No mechanism change** — `lib/measures.js` / `drive.js` / the `overflow` measure are
  untouched; only the recipe's *target selector* was wrong.

## [0.2.0] — 2026-06-09

### Added
- **Framework-module contract** `lib/framework-module.contract.md` — a doc (no code, adapter stays
  zero-dep) defining the 5 slots a web-framework module fills (`detect` / `runtime` / `source-map` /
  `recipes` / `locate`). Splits the adapter into a framework-agnostic **platform spine**
  (`web-reproduce` + `web-verify`) and the **Astro framework module** (`web-environment` = runtime,
  `web-source-map` = source-map, `astro-recipes` = recipes). `locate` is reserved (Sprint 3 / B-LOC).
- **New generic skill** `astro-recipes` (MIT, user-invocable) — framework-generic Astro UI-render fix
  patterns (missing `client:*` hydration; unwired sibling `*.behavior.ts`; `<pre>` overflow), each
  targeting a `web-harness` measure (`interaction` / `scroll-read-state` / `overflow`). Carries **no**
  org/design-system specifics — an external overlay pack adds those on top of the `recipes` slot. These
  recipes were extracted up from the private pack to make the engine genuinely generic.

### Changed
- **`CLAUDE.md` + `lib/capability.json` note:** declare the two non-overlapping skill groups and point
  to the contract. `web-environment` / `web-source-map` reframed as the Astro module's runtime /
  source-map slots — **wording only, no behavior change**. Capability tiers unchanged (UI/Logic/System
  = FULL).

### Notes
- `web-environment`'s port-hygiene sub-part is flagged as a Step-2 extraction candidate (shared runtime
  helper) — **not** split in this release.

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

---

# Historical — shipwithai-fixkit-web-harness (pre-merge)

The standalone harness plugin's changelog, preserved verbatim when it was folded into this adapter
in `0.3.0` (2026-06-11). These versions refer to the OLD `shipwithai-fixkit-web-harness` plugin.

## [web-harness 0.2.0] — 2026-06-08
### Added
- `scroll-read-state` — a 6th measure for scroll-spy / scroll-revealed UI whose proof is
  *scroll-then-read*. Reads a target's allowlisted state prop at rest, scrolls a container (or the
  document scrolling element) to `--ratio` of its scrollable height, waits for
  `IntersectionObserver`/scroll listeners to settle, then re-reads. `ok` when the state reached
  `--expected` (or simply changed, if absent). Unblocks BUG-005 (ReactionsBar scroll-spy + `auto`).
- New helper `measures.scrollReadState(o)` and the `scroll-read-state` runner branch in `drive.js`
  (`--target`, `--ratio`, optional `--scroller`/`--prop`/`--expected`/`--wait`).

### Notes
- **No new UI method:** `scroll-read-state` emits the existing `interaction-assertion` (a
  scroll-then-read is a post-action state assertion). The harness still maps to exactly the five UI
  `LAYER_METHODS`; **zero** change to core (validator, `LAYER_METHODS`, or the core gate).
- Tier-A unit test extended (red→green→mutation-checked); Tier-B smoke gains a scroll-spy section in
  the broken/fixed fixtures plus a missing-`--ratio` failure-shape assertion.

## [web-harness 0.1.0] — 2026-06-07
### Added
- Initial MVP: the in-loop `~~browser` binding (Phase-1 web-harness).
- `lib/drive.js` — headless Playwright runner; CLI emits `{ method, ok, evidence }` for the five UI
  measures (overflow / computed-style / console / interaction / viewport), mapping 1:1 onto the five
  UI `LAYER_METHODS`. Failure → non-zero exit with `{ ok:false, error }` and no `method`.
- `lib/measures.js` — the five pure, browser-free shaping helpers (deterministically unit-tested).
- `skills/browser-drive/SKILL.md` — `user-invocable:false` recipe surface documenting the CLI contract.
- `CONNECTORS.md` — declares this plugin is the `~~browser` primary binding.
- `tests/run-all.js` — split gate: Tier A (zero-dep quality limits + version sync + `measures.js`
  unit test + cross-plugin contract test vs core `validateLedger`) and conditional Tier B (live
  Playwright smoke over the broken/fixed fixtures, with SKIP when Playwright is absent).
- `evals/fixtures/smoke-page/{broken,fixed}.html` and `evals/fixtures/contract/*.md` fixtures.

### Notes
- No change to the core engine, the ledger validator, or `tests/run-all.js` — the validator already
  binds the five UI methods and gates `closed` on FULL + evidence + verifier.
- Playwright is a documented prerequisite (`npx playwright install chromium`), not vendored.
