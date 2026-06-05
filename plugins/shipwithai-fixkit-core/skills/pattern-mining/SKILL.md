---
name: pattern-mining
description: "Mine the append-only .fixkit/ ledger history for recurring root-cause patterns (structural scope-token clustering); propose human-reviewed playbook entries citing source bug IDs. Read-only."
version: 0.1.0
license: MIT
user-invocable: false
---

# Pattern mining — learn from history, propose (never apply)

The ledger is **append-only**, so the accumulated `.fixkit/` directory is a mineable record. This
sub-skill runs the miner over it, ranks recurring patterns, and emits **playbook proposals** — each
one citing the bug IDs that are its evidence. A human reviews; nothing is auto-applied, and **no
ledger is ever written**.

## The loop

```
mine (lib/pattern-miner.js)  ->  rank candidates  ->  render proposals citing bug IDs
```

Invoke the miner directly (zero-dep, read-only):

```
node lib/pattern-miner.js <fixkit-dir> [--threshold N] [--json]
```

- `--json` → the structured report (for tooling); default → a markdown proposal.
- exit 0 = ran (a clean "no pattern" is **not** a failure); exit 1 = a malformed ledger (loud).

## The matching key (structural — the miner discovers, it does not assume)

Two ledgers cluster only when their normalized `root_cause` shares a **structurally detected scope
token** — a package reference (`@scope/package`) or a backtick-quoted identifier — **plus** at least
one more shared salient token (K=2 total). A frequency `threshold` (default 2) decides when a
cluster becomes a candidate. There is **no curated noun list in core** (that would hard-code one
corpus's answer); an optional curated-vocabulary *boost* only re-ranks, and its values live in the
org **pack config profile** (`shipwithai-fixkit-pack/CLAUDE.md` → `pattern_mining`), never in core.

## Thresholds are tunables, not constants

`threshold` and `minSharedTokens` (K) are injectable. When a pack is present, read
`pattern_mining.frequency_threshold` from its config profile and pass it via `--threshold`. Core
defaults (2 / 2) stand alone when no pack is installed.

## Proposals cite evidence, never assert

Each candidate becomes a proposal listing its **source bug IDs**, the shared scope token, and the
common facets (e.g. `symptom_layer`). The proposal recommends a playbook entry; it does **not**
write one. Destination: **stdout** by default; with `--out <dir>`, the wiring writes
`PATTERN-<slug>.md` into a *target repo's* `docs/playbook/` — **never** into any `.fixkit/` dir.

## Honesty clause

If the corpus yields nothing at the threshold, the report says so plainly. Do **not** lower the
threshold to force a hit, and do **not** edit the matcher to manufacture an expected cluster — a
small corpus that genuinely yields nothing is a true result to report, not a failure to paper over.

## What this skill does NOT do

- It does **not** write to any `.fixkit/` ledger (append-only is the ledgers' property) or mutate
  bug state — its only output is a separate proposal artifact.
- It does **not** auto-apply a playbook entry; a human reviews every proposal.
- It does **not** hardcode a domain vocabulary in core; the structural scope token is the key and
  any curated boost lives in the pack config profile.
- It does **not** lower the threshold or alter the matcher to force a pattern to appear.
- It does **not** classify, diagnose, or verify a bug — see `triage`, `spine`, `verification`.
