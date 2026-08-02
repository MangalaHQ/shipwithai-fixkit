# Implementation PLAN — `fix_source` classification (multi-repo design-system seam)

> **Implements spec:** `docs/specs/2026-08-01-fix-source-classification-spec.md` (rev-1, critic-passed)
> **Issue:** [#16](https://github.com/MangalaHQ/shipwithai-fixkit/issues/16)
> **Phase:** 0 (seam-wiring only) · **Change class:** trust-anchor (tests-first, mutation-checked)
> **ADR gate:** ADR-0002 — this PLAN requires approval BEFORE any code is written (HALT).
> **Status:** DRAFT for approval. No production code touched by this document.

This plan is executor-ready: every step names the exact file, the exact function/insertion point,
the fixture that proves it, and the mutation that must flip the result. It references the **actual**
code read from the repo (`validateLedger`, `applyTransition`, `POST_ROOTCAUSE_STATES`, `blank()`,
the `v.push({code,message})` pattern, the `refuse()` helper, section numbering in `tests/run-all.js`).

---

## 0. PRE-FLIGHT VALIDATION — are the 3 previously-blocking items resolvable as written?

All three critic-closed items were re-checked against the real code. **None is a blocker.** Details:

### B1 — `both` must not drop the consumer half (`pending_followup` tracking)
**Resolvable.** `escalated` is reached by the `escalate` event, which in `applyTransition` sets
`l.state = 'escalated'` with **no predecessor guard and no field-stripping** (validator.js:131-134).
The `both` half-life is carried by a *new additive field* `pending_followup: consumer`, not by a new
state. Because `escalate` does not clear other fields, a `both` ledger can legitimately sit at
`escalated` while `pending_followup: consumer` records the debt. The happy fixture
`crossrepo.both-followup.md` asserts exactly this (state `escalated` + `pending_followup: consumer`
both survive validation). **Confirmed implementable.**

### B2 — `fix_source → root_cause_layer` consistency guard
**Resolvable.** `root_cause_layer` (with the `upstream` enum value) is already in the schema
(`ledger.schema.md:18`) but is **not referenced anywhere in `ledger-validator.js` today** — grep-verified.
So `FIXSOURCE_ROOTCAUSE_MISMATCH` is genuinely the *first* code enforcing it; there is no pre-existing
guard to reuse or weaken. It slots cleanly into `validateLedger` as a new invariant `v.push`. **Confirmed.**

### B3 — explicit-input `multi_repo` (no `node_modules` scan in core)
**Resolvable.** `multi_repo` is a plain top-level bool. It flows into the validator via the existing
`payload.ledger` merge (`Object.assign(l, payload.ledger)`, validator.js:118) or via the static
snapshot. `triage/SKILL.md` records it from an explicit invocation/config signal — it is Phase-0 pure
data, no detection logic. **Confirmed. No auto-detect code is introduced.**

### Parser pre-flight (zero-dep YAML subset)
`lib/frontmatter.js` `parseScalar` already handles `true`/`false` → bool, bare tokens → string,
quoted → string. The three new fields are **all top-level scalars**:
`multi_repo: false` (bool), `fix_source: consumer` (string), `pending_followup: none` (string).
**No parser change is needed** — verified against `parseScalar` (frontmatter.js:13-24). The plan adds a
defensive parser unit assertion (Step 1e) to prove this rather than assume it.

> **VERDICT: NO BLOCKERS.** The spec is executable as written. One scoping decision the spec leaves
> genuinely open (cross-repo-handoff artifact: extend vs. new file) is resolved in §3 below with a
> recommendation, since an executor must not re-derive it.

---

## 1. Decisions this plan locks (so the executor derives nothing)

| # | Decision | Rationale |
|---|---|---|
| P1 | `FIX_SOURCE_UNSET_MULTIREPO` and `FIXSOURCE_ROOTCAUSE_MISMATCH` live in **`validateLedger`** (invariant auditor). | Both are static properties of a snapshot; fixtures are static markdown → they must fire under `validateLedger`. |
| P2 | `CROSS_REPO_CONSUMER_EDIT` lives on **both surfaces**: a transition check in `enter_fixed`/`enter_candidate`, and an invariant twin in `validateLedger`. | Mirrors the existing `HARD_LOCK_VIOLATION` two-surface pattern (validator.js:77-79 + :142) so the two surfaces cannot drift. The `neg-crossrepo.consumer-edit.md` static fixture needs the invariant twin. |
| P3 | New guards **only activate when `multi_repo === true`** (except the mismatch invariant, which is safe to run always but is vacuous when `fix_source` is blank). | Backward-compat: single-repo ledgers (`multi_repo` absent/false) are untouched → AC6. |
| P4 | Cross-repo handoff = **NEW file** `lib/cross-repo-handoff.schema.md` + `lib/cross-repo-handoff-validator.js`. NOT an extension of `handoff/v0`. | See §3. |
| P5 | Scope of all three guards = **`POST_ROOTCAUSE_STATES`** (`['fixed','candidate','verified','closed']`), reusing the existing const (validator.js:17), to mirror the Iron Law. `CROSS_REPO_CONSUMER_EDIT` additionally blocks the *transitions into* `fixed`/`candidate`. | Spec §4.2 "Scope thống nhất = POST_ROOTCAUSE_STATES". |

---

## 2. Ordered work breakdown (tests-first — BLOCKING order)

Phases run in order. Each guard's **fixture is created and wired into the gate as a RED expectation
BEFORE the validator code exists** (ADR-0002/0003). The executor runs `node tests/run-all.js` after
each phase; it is expected RED until the matching validator step lands, then GREEN.

### Phase A — Fixtures + gate expectations (RED first)
All paths under `plugins/shipwithai-fixkit-core/`.

- **A1** `evals/fixtures/ledger/neg-fixsource.unset-multirepo.md` **(A)** — `multi_repo: true`,
  `fix_source: ""`, `root_cause: "non-empty"`, `root_cause_layer: upstream`, `state: fixed`,
  `hard_lock_violations: []`. Body notes it is a negative fixture for `FIX_SOURCE_UNSET_MULTIREPO`.
- **A2** `evals/fixtures/ledger/neg-crossrepo.consumer-edit.md` **(A)** — `multi_repo: true`,
  `fix_source: design-repo`, `root_cause_layer: upstream`, `root_cause: "..."`, `state: fixed`.
  (design-repo sitting at a consumer post-fix state → must REJECT `CROSS_REPO_CONSUMER_EDIT`.)
- **A3** `evals/fixtures/ledger/neg-fixsource.rootcause-mismatch.md` **(A)** — `multi_repo: true`,
  `fix_source: design-repo`, `root_cause_layer: Logic`, `root_cause: "..."`, `state: diagnosed`.
  (design-repo with a non-`upstream` root cause → REJECT `FIXSOURCE_ROOTCAUSE_MISMATCH`.)
- **A4** `evals/fixtures/ledger/crossrepo.escalated.md` **(A)** — happy design-repo:
  `multi_repo: true`, `fix_source: design-repo`, `root_cause_layer: upstream`,
  `root_cause: "..."`, `state: escalated`, `pending_followup: none`. Expect **ACCEPT**.
- **A5** `evals/fixtures/ledger/crossrepo.both-followup.md` **(A)** — happy both:
  `multi_repo: true`, `fix_source: both`, `root_cause_layer: upstream`, `state: escalated`,
  `pending_followup: consumer`. Expect **ACCEPT**; body asserts "ledger does NOT report clean terminal".
- **A6** Negative control is folded into the new gate section (Step E1), not a fixture file:
  reuse an inline snapshot with `multi_repo: false` + blank `fix_source` at a POST_ROOTCAUSE state and
  assert **no** new code fires (mirrors the inline-snapshot style already used in §5/§6b).

> Fixture field template (copy the `happy-path.closed.md` frontmatter shape; add the 3 new keys).
> Every fixture MUST keep `hard_lock_violations: []` or the existing hard-lock invariant will also fire
> and muddy the assertion — set it explicitly.

### Phase B — Validator guards (make RED → GREEN), tests-first satisfied by Phase A
File: `lib/ledger-validator.js`. See §4 for exact insertion points + mutation for each.

- **B1** Add `FIXSOURCE_ROOTCAUSE_MISMATCH` (invariant) in `validateLedger`.
- **B2** Add `FIX_SOURCE_UNSET_MULTIREPO` (invariant) in `validateLedger`.
- **B3** Add `CROSS_REPO_CONSUMER_EDIT` — invariant twin in `validateLedger` **and** transition check
  in the `enter_fixed`/`enter_candidate` case (a shared helper `crossRepoConsumerViolation(l)` mirroring
  `hardLockViolation`, returning a violation or null).
- **B4** Do **not** add any new value to `STATES`, `POST_ROOTCAUSE_STATES`, `PREDECESSORS`, or the
  `module.exports`. No new state machine (spec §10). No exported symbol changes required.

### Phase C — Schema + design docs
- **C1** `lib/ledger.schema.md` **(M)** — add `multi_repo`, `fix_source`, `pending_followup` rows to the
  Frontmatter table (§4.1 wording); add the 3 new rule-codes to the "State-transition guards" table with
  the `fix_source ∈ {design-repo,both} ⇒ root_cause_layer == upstream` constraint note.
- **C2** `docs/DESIGN-DIAGRAMS.md` **(M)** — §10 already reflects all 3 fields, all 3 rule-codes, the
  `cross-repo-handoff/v0` artifact, `pending_followup`, and 5 fixtures (verified: lines 470-522).
  **Action:** confirm the final artifact filename chosen in §3 matches the diagram label
  `cross-repo-handoff/v0` and adjust the prose read-out only if §3's decision changes a name. Expected
  edit: near-zero (diagram is already rev-1-synced). This is a **diagram-consistency check**, not a rewrite.

### Phase D — Cross-repo handoff artifact (§3 decision)
- **D1** `lib/cross-repo-handoff.schema.md` **(A)** — contract doc (fields per §3), < 150 lines if placed
  under a `references/` dir; it is under `lib/` so the < 150 reference-linter does NOT apply, but keep it tight.
- **D2** `lib/cross-repo-handoff-validator.js` **(A)** — `validateCrossRepoHandoff(h)` → `{ok, violations[]}`,
  zero-dep, same shape/style as `handoff-validator.js`. Rule codes in §3.

### Phase E — Gate wiring
File: `tests/run-all.js`.
- **E1** Add a new section (place after `6d. handoff/v0` and before `6e. Pattern miner`, e.g. **§6f
  cross-repo `fix_source` guards**) that: loads the 5 new fixtures via `readLedger`, asserts the 3 negatives
  REJECT with the right code, the 2 happies ACCEPT, the inline single-repo negative control does NOT fire,
  and includes the **mutation assertions** (§4). Use the existing `hasCode`/`assert` helpers.
- **E2** Add a **§6g cross-repo-handoff/v0 format** block mirroring §6d: a valid artifact ACCEPTS, and at
  least two malformed variants REJECT with their codes (one missing `target_repo`, one bad `sequence`).
- **E3** No change to the linters in §7 — new fixtures are `.md` under `evals/fixtures/ledger/` and are not
  skills/agents, so §7's H2 / line-limit / eval-schema / version-sync checks are unaffected **except** E4.

### Phase F — Triage / orchestrator / agents (prose + `does NOT do` + evals)
- **F1** `skills/triage/SKILL.md` **(M)** — add an "explicit `multi_repo` precondition" subsection: triage
  records `multi_repo` from an explicit invocation/config signal, does NOT scan `node_modules`, does NOT
  decide `fix_source` (that is DIAGNOSE/Axis-B). Add one line to `## What this does NOT do`. **Line budget:
  currently 66/200 → ample headroom.** Keep description < 200 chars (unchanged).
- **F2** `skills/triage/evals/evals.json` **(M)** — keep ≥ 5 evals, ≥ 3 trigger / ≥ 2 must-not. Add ≥ 1
  trigger eval for a multi-repo signal and ≥ 1 must-not (e.g. "auto-detect the DS package" → must NOT
  trigger a node_modules scan). Every eval keeps `{id,prompt,expectedBehavior,category,shouldTrigger}`.
- **F3** `commands/fix.md` **(M)** — insert the gate between step 6 (Diagnose) and step 7 (Gate): if
  `multi_repo`, DIAGNOSE must set `fix_source`, then route `consumer` (normal) / `design-repo` (STOP →
  emit cross-repo handoff → `escalate` → state `escalated`, no consumer edit) / `both` (as design-repo +
  `pending_followup: consumer` + surface release sequence). Cite the 3 new rule-codes. Extend
  `## What this command does NOT do` with the STOP-cross-repo behavior.
- **F4** `agents/ui-bug-agent.md`, `agents/logic-bug-agent.md`, `agents/system-bug-agent.md` **(M)** — add
  the **primary-prevention gate**: after DIAGNOSE, answer "root cause in the package or in our repo?" →
  set `fix_source`; when `fix_source ∈ {design-repo, both}` do NOT edit the consumer, gap-log + escalate.
  Extend each `## What this agent does NOT do`. (All three already end with the correct H2 — verified for
  `ui-bug-agent`; executor must preserve that H2 as the LAST heading so §7b stays green.)

### Phase G — Rule-code vocab + version sync
- **G1** `CLAUDE.md` (core) **(M)** — append the 3 rule-codes to the "Rule codes (shared vocabulary)" list
  (currently 6 codes, line 15-16).
- **G2** **SemVer bump** — this adds fields + guards + an artifact (backward-compatible feature) → **MINOR
  bump `0.3.0 → 0.4.0`** on `shipwithai-fixkit-core`. Update **all 4 keys** (§7e enforces this):
  1. `plugins/shipwithai-fixkit-core/.claude-plugin/plugin.json` `version`
  2. `plugins/shipwithai-fixkit-core/.claude-plugin/marketplace.json` top-level `version`
  3. same file `plugins[0].version`
  4. root `.claude-plugin/marketplace.json` → the `shipwithai-fixkit-core` entry's `version`
  (Do NOT touch the other adapter entries or the root top-level `version: 0.1.0`.)

### Phase H — Final gate
- **H1** `cd plugins/shipwithai-fixkit-core && node tests/run-all.js` → exit 0. Then critic self-review
  (worker ≠ grader) per the repo's critic clause.

---

## 3. Cross-repo-handoff artifact decision (§4.6 resolution)

**Recommendation: a NEW artifact + NEW validator — do NOT extend `handoff/v0`.**

Reasoning (spec §4.6 already argues this; this plan commits it):
- `handoff/v0` is a **verification** handoff — its required fields (`symptom_layer`, `target.env`,
  `steps`, `assertion.{method,expected}` bound to `LAYER_METHODS`, `verified_by` slot) model *"someone
  observe this running result."* A cross-repo remediation models *"fix the DS package, publish a bump,
  bump the consumer dep"* — a **different shape** with no `assertion`/`LAYER_METHODS` binding.
- Overloading `handoff/v0` would force `assertion` to be optional, weakening the existing
  `HANDOFF_NO_ASSERTION` guard — a trust-anchor regression. Rejected.
- A separate `cross-repo-handoff/v0` keeps each validator single-purpose and zero-dep, matching the
  repo's "compose by convention" ethos. The DESIGN diagram already labels it `cross-repo-handoff/v0`.

**Fields** (`lib/cross-repo-handoff.schema.md` + validator):

| Field | Type | Required | Rule code on violation |
|---|---|---|---|
| `version` | string (`cross-repo-handoff/v0`) | yes | `XREPO_BAD_VERSION` |
| `bug_id` | string | yes | `XREPO_NO_BUG_ID` |
| `target_repo` | string | yes | `XREPO_NO_TARGET_REPO` |
| `root_cause_ref` | string | yes | `XREPO_NO_ROOT_CAUSE_REF` |
| `remediation` | string (e.g. `fix DS → publish <bump> → bump consumer dep`) | yes | `XREPO_NO_REMEDIATION` |
| `sequence` | array (ordered steps, non-empty) | yes | `XREPO_NO_SEQUENCE` |
| `pending_followup` | enum `none`\|`consumer` | yes | `XREPO_BAD_FOLLOWUP` |

File-tree reflection (updates spec §9 line for this artifact):
```
lib/cross-repo-handoff.schema.md      (A)  contract
lib/cross-repo-handoff-validator.js   (A)  validateCrossRepoHandoff, zero-dep
```

---

## 4. Per-guard detail — insertion point · fixture · mutation

### Guard 1 — `FIXSOURCE_ROOTCAUSE_MISMATCH` (invariant)
- **File / function:** `lib/ledger-validator.js` → `validateLedger(l)`, add after the hard-lock invariant
  block (after validator.js:79), following the `v.push({code,message})` pattern.
- **Condition:**
  `if (['design-repo','both'].includes(l.fix_source) && !blank(l.fix_source) && l.root_cause_layer !== 'upstream') v.push({ code: 'FIXSOURCE_ROOTCAUSE_MISMATCH', message: ... });`
- **Fixture proving it:** `neg-fixsource.rootcause-mismatch.md` (A3) → `fix_source: design-repo`,
  `root_cause_layer: Logic` → REJECT.
- **Mutation that must flip REJECT→ACCEPT:** in the gate section, run the same fixture through a mutated
  copy where the condition's layer check is inverted (or, per repo style, temporarily loosen to
  `=== 'upstream'`); assert it would ACCEPT — proving the guard is load-bearing. Implement the mutation as
  a second inline snapshot with `root_cause_layer: upstream` that must ACCEPT (the control), matching the
  §4/§6b control-pair idiom already in the gate.

### Guard 2 — `FIX_SOURCE_UNSET_MULTIREPO` (invariant, pre-fix)
- **File / function:** `validateLedger(l)`, add adjacent to Guard 1.
- **Condition:**
  `if (l.multi_repo === true && POST_ROOTCAUSE_STATES.includes(state) && blank(l.fix_source)) v.push({ code: 'FIX_SOURCE_UNSET_MULTIREPO', message: ... });`
- **Fixture:** `neg-fixsource.unset-multirepo.md` (A1) → `multi_repo: true`, `fix_source: ""`, `state: fixed` → REJECT.
- **Mutation:** control snapshot with `multi_repo: false` (same otherwise) → must ACCEPT (guard does not
  fire for single-repo → also serves as AC6 regression control). Second control: set `fix_source: consumer`
  → ACCEPT. Flipping `multi_repo` gate off ⇒ REJECT→ACCEPT proves the field is load-bearing.

### Guard 3 — `CROSS_REPO_CONSUMER_EDIT` (transition + invariant twin)
- **Shared helper:** add `function crossRepoConsumerViolation(l)` near `hardLockViolation` (validator.js:41):
  returns a violation when `l.multi_repo === true && ['design-repo','both'].includes(l.fix_source)` and the
  target is a consumer post-fix state (`fixed`/`candidate`), else null. Message: "…must escalate, not enter
  fixed/candidate in the consumer".
- **Transition surface:** in the `enter_fixed`/`enter_candidate` case (validator.js:135-147), after the
  hard-lock push line (:142), add `{ const xr = crossRepoConsumerViolation(l); if (xr) v.push(xr); }`.
- **Invariant twin:** in `validateLedger`, add
  `if (l.multi_repo === true && ['design-repo','both'].includes(l.fix_source) && ['fixed','candidate'].includes(state)) v.push({ code: 'CROSS_REPO_CONSUMER_EDIT', message: ... });`
- **Fixture:** `neg-crossrepo.consumer-edit.md` (A2) → static snapshot `fix_source: design-repo`,
  `state: fixed` → invariant twin REJECTS. Plus an inline transition assertion in the gate:
  `applyTransition({state:'diagnosed', root_cause:'rc', multi_repo:true, fix_source:'design-repo', ...}, 'enter_fixed')`
  → REFUSED with `CROSS_REPO_CONSUMER_EDIT`, state stays `diagnosed`.
- **Mutation:** control with `fix_source: consumer` → `enter_fixed` SUCCEEDS (guard does not fire),
  proving `fix_source` is load-bearing. Second control: the `escalate` path for the same design-repo ledger
  ACCEPTS (reaches `escalated`) — proving the guard forces the correct off-ramp, not a dead end.

> **Happy-path proofs (AC4/AC5):** `crossrepo.escalated.md` (A4) and `crossrepo.both-followup.md` (A5)
> must ACCEPT under `validateLedger` — they carry `state: escalated` (not a consumer post-fix state) so
> none of the 3 guards fire, and `both` additionally carries `pending_followup: consumer`.

---

## 5. Verification ownership (ADR-0002)

| Check | Mechanism | Owner |
|---|---|---|
| 3 guards REJECT their negatives; 2 happies ACCEPT | `tests/run-all.js` §6f | **Gate (mechanized)** |
| Each guard bites (mutation flips REJECT→ACCEPT) | mutation asserts in §6f | **Gate (mechanized)** |
| Single-repo (`multi_repo:false`) does not regress | inline control in §6f + full existing suite | **Gate (mechanized)** |
| cross-repo-handoff/v0 format valid/invalid | §6g | **Gate (mechanized)** |
| Parser handles 3 new scalar fields | §1 parser assert (Step 1e) | **Gate (mechanized)** |
| 4-key version sync at 0.4.0 | §7e | **Gate (mechanized)** |
| Skill/agent still end with `## What … does NOT do`; line/desc/eval limits | §7a-d | **Gate (mechanized)** |
| Prose gate in `fix.md`/agents actually reads as primary prevention; wording is coherent | judgment | **Critic (worker ≠ grader)** |
| `pending_followup` semantics ("no fake terminal") faithfully expressed | judgment | **Critic** |
| DESIGN §10 diagram matches final names | judgment (diff review) | **Critic** |
| Live-UI proof / browser assertion | **N/A** — no live UI in this change; all changes are ledger/prose/validator. No `~~browser` involved. | **N/A** |

---

## 6. Risk register + rollback

| ID | Risk | Detection | Mitigation / rollback |
|---|---|---|---|
| RR1 | New invariant fires on legacy single-repo ledgers (`multi_repo` absent → `undefined`). | Full existing fixture suite in the gate would flip RED. | Guards gate on `multi_repo === true` (strict) and `POST_ROOTCAUSE_STATES` membership; `undefined !== true`. Existing fixtures have no `multi_repo` key → safe. |
| RR2 | Mismatch invariant fires spuriously when `fix_source` blank. | Happy/legacy fixtures RED. | Condition guards `!blank(l.fix_source)` first. |
| RR3 | Transition twin diverges from invariant twin (drift). | A snapshot that one surface rejects and the other accepts. | Shared `crossRepoConsumerViolation` helper used by both surfaces (the hard-lock precedent). |
| RR4 | `hard_lock_violations` omitted in a new fixture → hard-lock invariant also fires, masking the intended code. | Wrong/extra code in `res.violations`. | Every new fixture sets `hard_lock_violations: []` explicitly (Phase A note). |
| RR5 | Version bump misses one of 4 keys. | §7e assertion RED. | Checklist in G2 enumerates all 4; gate is the backstop. |
| RR6 | Skill/agent edit drops the trailing `## What … does NOT do` H2. | §7a/§7b RED. | Keep that H2 as the LAST heading; append new bullets above it. |
| **Rollback** | Any regression. | — | Solution is **purely additive** (spec §9: no `D`). Reverting the branch removes all new fields/guards/artifact; legacy behavior is byte-identical because guards only activate on `multi_repo === true`. |

---

## 7. Diff size / touch count · branch · commit sequence

**Touch count:** 13 modified + 7 added = **20 files.**
- Modified (13): `lib/ledger-validator.js`, `lib/ledger.schema.md`, `commands/fix.md`,
  `agents/{ui,logic,system}-bug-agent.md` (3), `skills/triage/SKILL.md`, `skills/triage/evals/evals.json`,
  `tests/run-all.js`, `CLAUDE.md` (core), plugin.json, per-plugin marketplace.json, root marketplace.json,
  `docs/DESIGN-DIAGRAMS.md` (near-zero, consistency check).
- Added (7): 5 ledger fixtures + `lib/cross-repo-handoff.schema.md` + `lib/cross-repo-handoff-validator.js`.

**Estimated net diff:** ~350–450 added lines (mostly fixtures + gate section + validator ~30 lines + new
validator/schema ~120 lines + prose). No deletions of logic.

**Branch:** `phase-1/fix-source-classification`
> Note: repo convention is `phase-N/<topic>`. The spec is labeled Phase-0 *scope*, but the branch-naming
> convention in `CLAUDE.md` uses `phase-N`; recent history uses `phase-1/*`. Recommend `phase-1/fix-source-classification`
> to match live branches; if the maintainer wants scope-accurate naming, `phase-0/fix-source-classification`
> is the alternative. **Open question — see below.**

**Conventional-commit sequence (one logical unit per commit, tests-first order):**
1. `test(ledger): add fix_source multi-repo fixtures + RED gate section (#16)`
2. `feat(validator): enforce fix_source guards — unset/consumer-edit/rootcause-mismatch (#16)`
3. `feat(handoff): add cross-repo-handoff/v0 schema + validator (#16)`
4. `docs(schema): document multi_repo/fix_source/pending_followup + 3 rule-codes (#16)`
5. `feat(orchestrator): fix_source gate in fix.md + layer-agents + triage precondition (#16)`
6. `chore(release): bump fixkit-core 0.3.0 → 0.4.0 (4-key sync) + rule-code vocab (#16)`

All commit messages end with the repo's `Co-Authored-By` trailer.

---

## 8. Open questions (also appended to `.omc/plans/open-questions.md`)

- **Branch scope naming** — `phase-0/*` (scope-accurate) vs `phase-1/*` (matches live branches). Affects
  the branch name only; recommend `phase-1/fix-source-classification`. Maintainer to confirm.
- **`cross-repo-handoff/v0` emission target in Phase 0** — where does the emitted artifact physically land
  (`.fixkit/handoffs/`? inline in the ledger body?)? Spec says "emit + surface" only; the validator exists,
  but the *sink* is not specified. Non-blocking for the guard work; needs a one-line decision before F3
  wording is final.

## 9. What this PLAN does NOT do
- It does not implement any production code — it is planning only (ADR-0002 HALT for approval).
- It does not touch root `PLAN.md` (reserved for Phase-1).
- It does not execute cross-repo remediation, auto-detect `multi_repo`, or fix bug #348.
- It does not weaken or remove any existing guard; all changes are additive.
