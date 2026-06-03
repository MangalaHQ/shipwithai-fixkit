# ADR-0004 — Deterministic ledger gate (Phase-0 structural decision)

**Status:** Accepted (new for fixkit Phase 0).

## Context
The orchestrator and skills are markdown prompts interpreted by a model — they cannot self-test in
CI. Yet the Phase-0 gate demands *executable, deterministic* negative tests for the integrity
guard, the Iron-Law gate, and 3-strikes escalation.

## Decision
Encode the ledger state machine as a zero-dependency Node module
(`lib/ledger-validator.js`) with two surfaces:

- `validateLedger(snapshot)` — audits a static ledger against the invariants (integrity, ASSIST
  ceiling, layer-proof binding, 3-strikes consistency).
- `applyTransition(ledger, event)` — the guard the orchestrator calls; it checks **before**
  mutating, so the Iron-Law and 3-strikes negatives test the *transition*, not a residue.

Committed YAML fixtures under `evals/fixtures/ledger/` drive both, run by `tests/run-all.js` — the
blueprint's existing Node test hook (no CI surgery). The negatives are fails-as-expected: green CI
proves the guards bite. `commands/fix.md` cites the same rule-codes, so prose and code share one
vocabulary.

fixkit also **extends** the blueprint (transparently): line limits, the `## What this does NOT do`
section, the `user-invocable:false` sub-skill convention, ≥5 evals with a 3-trigger/2-must-not
split, and a 4-key version sync are enforced as **blocking** in `tests/run-all.js` (the ported
`validate-plugin.yml` keeps them as warnings).

## Alternatives considered
- **Python validator** — diverges from the blueprint's Node test hook (CI surgery) for no
  determinism gain. Rejected.
- **Bash/grep assertion harness** — brittle on nested YAML (`verification` object); the validator
  is the trust anchor and cannot be the flakiest code in the repo. Rejected.

## Consequences
- A small, well-tested JS surface is the deterministic trust anchor for the whole gate.
- The fidelity gap (validator green ≠ model-loop correct) is bounded and named: end-to-end
  orchestrator fidelity is deferred to the Phase-1 live-bug gate.
- **Seam:** Phase-1 hard-locks (AD-027 etc.) add rules + events to the *same* state machine and
  fixtures to the *same* runner, keyed off `hard_lock_violations`.

## Open follow-up
- `inline-code <= 20` is enforced; the blueprint's source wording (`< 20`) is ambiguous on the
  boundary. Settle the off-by-one if a future skill hits exactly 20 lines in a block.
