# ADR-0003 — Read before edit (update protocol)

**Status:** Accepted (carried over from `shipwithai-plugins`).

## Context
Blind edits to existing files corrupt structure and lose context.

## Decision
Editing existing artifacts follows AUDIT → IMPACT → PLAN → approve → execute. Read the target (and
its section) fully before changing it; if what you find contradicts how it was described, surface
that instead of proceeding. Prefer targeted section edits over wholesale rewrites.

## Consequences
- Cross-file consistency (rule codes, ledger schema, version) is preserved across edits.
- The deterministic gate (`tests/run-all.js`) catches structural regressions an editor might miss.
