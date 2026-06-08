# Changelog — shipwithai-fixkit-web-harness

All notable changes to this plugin. Versioning follows SemVer; `plugin.json` is the source of truth
(mirrored into both marketplace files — the 4-key sync).

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
