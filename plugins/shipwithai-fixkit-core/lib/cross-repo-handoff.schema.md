# cross-repo-handoff/v0 schema (multi-repo remediation handoff)

The artifact the engine emits when a bug's root cause lives in a versioned **design-system (DS)
package** rather than the consumer repo — i.e. `fix_source ∈ {design-repo, both}`. It records the
cross-repo remediation *path* ("fix the DS package → publish a bump → bump the consumer dep") so a
human or a Phase-1 pack can execute it. **Phase 0 only emits + surfaces this artifact; it does not
execute the remediation** (no `npm publish`, no dep bump — that is Phase 1+).

Validated by `lib/cross-repo-handoff-validator.js` (`validateCrossRepoHandoff`), zero-dependency.

## Why not reuse `handoff/v0`

`handoff/v0` (`lib/handoff.schema.md`) is a **verification** handoff: its required `assertion.{method,
expected}` is bound to `LAYER_METHODS` so a provider can *observe a running result*. A cross-repo
remediation is a **different shape** — there is no layer-proof assertion, only an ordered publish/bump
sequence. Overloading `handoff/v0` would force `assertion` to be optional and weaken its
`HANDOFF_NO_ASSERTION` guard (a trust-anchor regression). So this is a separate `cross-repo-handoff/v0`
with its own single-purpose validator, matching the repo's "compose by convention" ethos.

## Fields

| Field | Type | Required | Rule code on violation |
|---|---|---|---|
| `version` | string (`cross-repo-handoff/v0`) | yes | `XREPO_BAD_VERSION` |
| `bug_id` | string | yes | `XREPO_NO_BUG_ID` |
| `target_repo` | string | yes | `XREPO_NO_TARGET_REPO` |
| `root_cause_ref` | string | yes | `XREPO_NO_ROOT_CAUSE_REF` |
| `remediation` | string (e.g. `fix DS → publish <bump> → bump consumer dep`) | yes | `XREPO_NO_REMEDIATION` |
| `sequence` | array (ordered steps, non-empty) | yes | `XREPO_NO_SEQUENCE` |
| `pending_followup` | enum `none` \| `consumer` | yes | `XREPO_BAD_FOLLOWUP` |

- `target_repo` names which DS repo owns the fix.
- `root_cause_ref` points at the diagnosed root cause (e.g. the `.fixkit/<bug-id>.md` ledger).
- `pending_followup: consumer` marks a `both` bug: the DS half is escalated but the consumer dep-bump
  is still owed — the ledger must NOT report a clean terminal until that follow-up lands.

## Relationship to the ledger

The ledger carries the state (`escalated` + `pending_followup`); this artifact is emitted and surfaced
alongside it (the existing `handoff/v0` convention — a validated artifact, not a new committed file
sink). A `design-repo`/`both` bug reaches `escalated` via the `escalate` event; the three ledger guards
(`FIX_SOURCE_UNSET_MULTIREPO`, `CROSS_REPO_CONSUMER_EDIT`, `FIXSOURCE_ROOTCAUSE_MISMATCH`) enforce that
it never enters a consumer post-fix state instead.

## What this schema does NOT do

- It does not execute the remediation (publish / bump) — Phase 0 emits + surfaces only.
- It does not carry a layer-proof `assertion` — that is `handoff/v0`'s job, not this one.
- It does not replace the ledger state; the ledger remains the single source of truth for bug state.
