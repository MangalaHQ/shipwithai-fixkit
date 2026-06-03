# Quality standards — shipwithai-fixkit

## The quality matrix
| Dimension | Weight |
|---|---|
| Functional | 30% |
| Code | 20% |
| Docs | 20% |
| UX | 15% |
| Market | 10% |
| Reliability | 5% |

Thresholds: ≥ 8.0 = ship; 7.0–7.9 = soft-launch / internal; < 6.0 = not ready.
**Phase 0 target: ≥ 7.0** (internal). Phase 1 target: ≥ 8.0 (ship).

## Non-negotiables
- **Iron Law** — no fix before a written root cause.
- **Integrity rule** — no runner → no auto-close → handoff/v0; `closed` needs evidence + a named
  verifier.
- **Verification dictated by layer** — a rendered bug never closes on a source diff.
- **Compose by convention** — no `plugin.json` dependency wiring.
- **Vendored spine with attribution** — license header + `NOTICE`.
- **Scope guard** — every skill/agent ends with `## What this … does NOT do`.

## How quality is checked (no work doubled)
- **Mechanized (CI / `tests/run-all.js`):** lifecycle + negative tests, line/inline limits, eval
  schema, version sync, scope-guard presence.
- **Judgment (fresh critic + reviewer):** prompt quality, spine fidelity, seam placement, matrix
  score.
- **Live-UI:** N/A in Phase 0 (no rendered surface); arrives with the Phase-1 web adapter.

## Definition of done (Phase 0)
`node tests/run-all.js` exits 0 with the 4 acceptance checks + honesty invariants + linters green,
and a fresh critic has refuted the work and scored the matrix ≥ 7.0.
