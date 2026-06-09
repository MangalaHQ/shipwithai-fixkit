# Changelog — shipwithai-fixkit-web-harness

All notable changes to this plugin. Versioning follows SemVer; `plugin.json` is the source of truth
(mirrored into both marketplace files — the 4-key sync).

## [0.2.0] — 2026-06-08
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

## [0.1.0] — 2026-06-07
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
