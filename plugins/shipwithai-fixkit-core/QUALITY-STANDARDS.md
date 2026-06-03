# Quality standards — shipwithai-fixkit-core

## Definition of done (Phase 0)
`node tests/run-all.js` exits 0 with:
- the 4 acceptance checks green (happy path, integrity guard, Iron-Law gate, 3-strikes fires),
- the honesty invariants green (ASSIST cannot close, layer-proof binding),
- the parser unit tests green, and
- the convention + eval + version linters green;

and a **fresh critic** (worker ≠ grader) has refuted the work and scored the quality matrix ≥ 7.0.

## Non-negotiables
Iron Law · integrity rule · verification-by-layer · compose-by-convention · vendored spine with
attribution · every skill/agent ends with `## What this … does NOT do`.

## Checked, by lane
| Lane | What | Owner |
|---|---|---|
| Mechanized | lifecycle, negatives, limits, eval schema, version sync | `tests/run-all.js` |
| Judgment | prompt quality, spine fidelity, seam placement, matrix score | fresh critic + reviewer |
| Live-UI | rendered proof | N/A in Phase 0 |

## Limits
SKILL.md < 200 · references < 150 · bundles < 500 · inline code ≤ 20 · description < 200 chars ·
evals ≥ 5 (3 trigger / 2 must-not) · 4-key version sync · ≥ 1 `user-invocable:false` skill.
