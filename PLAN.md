# PLAN.md — Phase 0: `shipwithai-fixkit-core` MVP

> **Status:** Consensus reached (Planner → Architect → Critic). **HALTING for Cowork review + Ethan's plan-in approval** (ADR-0002).
> **Gate:** ADR-0002 plan-before-execute. No production file is written until this PLAN is approved.
> **Source of truth:** `../shipwithai-fixkit-design/{08,09,10,12}` + `../shipwithai-plugins/` conventions (both confirmed reachable — Prereq item 4 satisfied, no HALT).
>
> **Consensus record (ralplan):**
> - **Architect** found one blocking soundness defect — acceptance checks #3 (Iron-Law) and #4 (3-strikes) originally tested *static snapshots*, not the *transition guards* they name; #4 would pass green-by-construction. **Resolved:** the state machine now exposes `applyTransition(ledger, event)`; #3/#4 drive *events* (`enter_fixed` refusal; `record_fix_failure` ×3 fires `escalated`). Plus 4 CI-conformance gaps. **Resolved.**
> - **Critic** verdict 1 = ITERATE: 3 MAJOR (inline-code≤20 linter, `user-invocable:false` sub-skill demonstration, 4-key version sync). **Resolved.**
> - **Critic** verdict 2 = **APPROVE**. All 7 Phase-0 gate checks map to runnable pass conditions; no check merely asserted.
> - **Open residual (non-blocking):** `inline-code ≤20` vs source `<20` off-by-one is ambiguous in the blueprint; settle during execution.

---

## RALPLAN-DR summary

### Principles
1. **Determinism over assertion.** Every Phase-0 gate check that *can* be mechanized is an executable, reproducible command (`node tests/run-all.js` → exit 0/non-0), not a prose claim. The worker shows command output; a fresh critic grades.
2. **Core stays platform-agnostic.** No real adapter, no ShipWithAI specifics. The "platform" is a *test fixture* stub, never a shipped plugin. Connectors are `~~category` placeholders with generic defaults.
3. **The ledger is the single source of truth for bug state**, and its state machine is *enforced by code*, not by good intentions. Iron Law + integrity rule + 3-strikes are properties the validator can prove or refute on any ledger file.
4. **Compose by convention, not by wiring.** Slash-path references + `user-invocable:false` sub-skills + `agents/*.md`. Zero `plugin.json` dependency graph.
5. **Conform to the blueprint; extend it transparently.** Where fixkit is *stricter* than `shipwithai-plugins` (blocking line limits, ≥5 evals, the `## What this does NOT do` convention), that delta is declared in an ADR, not silently diverged.

### Decision drivers (top 3)
1. **The negative tests must be deterministic and CI-runnable** (handoff §0.2) — this is the load-bearing decision. Markdown prompts cannot self-test; something executable must adjudicate ledger state.
2. **Blueprint conformance** — the repo must pass the *same* `validate-plugin.yml` shape so it slots into the family, while adding fixkit-specific gates.
3. **Phase-0 is a seam, not a cul-de-sac** — the gate/verification machinery must be the exact place Phase-1 hard-locks (AD-027 etc.) later plug in, without building them now.

### Viable options for the load-bearing decision (deterministic gate mechanism)

**Option A — Node.js ledger state machine (snapshot validator **+ transition function**) + YAML fixtures, run by `tests/run-all.js` (RECOMMENDED).**
A zero-runtime-dependency Node module (`lib/ledger-validator.js`) exposing **two surfaces**: `validateLedger(snapshot) → {ok, violations[]}` (static invariant auditor) **and** `applyTransition(ledger, event) → {ok, ledger', violations[]}` (the guard the orchestrator's gate calls). `tests/run-all.js` drives both: snapshot fixtures for *invariants* (#2) and *simulated event sequences* for *transition guards* (#3 Iron-Law gate, #4 three-strikes-fires). Blueprint CI already auto-runs `tests/run-all.js` if present (validate-plugin.yml:163–174) — zero CI surgery needed. (Architect correction: a static count-3 fixture cannot distinguish a working increment-and-escalate loop from an absent one; #3/#4 must drive *events*, not assert *snapshots*.)
- **Pros:** Deterministic, reproducible, runs in existing CI hook, Node already used by blueprint, no network, fixtures double as living documentation, and the transition function is the *single* state machine the runtime (`fix.md`) and tests both reference.
- **Cons:** Need a YAML reader. Hand-rolled subset parser (zero-dep) carries edge-case risk — mitigated by committing to zero-dep **with no `package.json`** and adding parser unit tests (see R3); no `js-yaml`/`npm ci` fallback (would break the blueprint's `npm install --ignore-scripts` hook).

**Option B — Python validator (mirror `publish-plugin.sh`'s `python3 -c` style).**
Blueprint scripts already shell out to `python3` for JSON. Use `python3` + a tiny YAML reader.
- **Pros:** PyYAML is batteries-adjacent; blueprint already invokes python3.
- **Cons:** Blueprint's auto-test hook is `tests/run-all.js` (Node), so Python needs an explicit CI step → CI surgery + divergence from the family's test convention. PyYAML is not stdlib (still a dep).

**Option C — Pure-bash assertion harness over `grep`/`awk` on frontmatter.**
- **Pros:** No language runtime beyond bash.
- **Cons:** Parsing nested YAML (`verification:` object) in bash is brittle and unreadable; the state machine becomes spaghetti. Rejected for maintainability and correctness risk — the validator *is* the trust anchor; it cannot be the flakiest code in the repo.

**Chosen: Option A.** Drivers 1 + 2 dominate: it is the only option that is both fully deterministic *and* rides the blueprint's existing Node test hook with no CI divergence. YAML risk is mitigated by writing a **narrow, schema-specific frontmatter parser** (the ledger schema is fixed and flat-ish — one nested object, `verification`), unit-tested by the fixtures themselves; `js-yaml` is held as a fallback if the parser proves fragile (decision logged in Risk R3).

*Invalidation of B/C:* B loses on CI-convention divergence (Driver 2) for no determinism gain over A. C loses on correctness/maintainability of nested-YAML parsing — unacceptable for the component that adjudicates every other guarantee.

---

## 1. Exact file tree (every path), mapped to doc 08 §4

Repo root: `../shipwithai-fixkit/` (currently: `README.md` + `.omc/` only; **no `.git` yet → `git init` is step 0**).

```
shipwithai-fixkit/
├── .claude-plugin/
│   └── marketplace.json                 # name "shipwithai-fixkit"; registers shipwithai-fixkit-core (P1+ plugins omitted, not placeholdered — see §note)
├── .github/workflows/
│   ├── validate-plugin.yml              # ported from blueprint + fixkit strict gates (blocking limits, ≥5 evals, "does NOT do" linter, node tests/run-all.js)
│   └── publish-plugin.yml               # ported from blueprint (version-bump → release)
├── NOTICE                               # credits superpowers:systematic-debugging, MIT © 2025 Jesse Vincent (full upstream license text)
├── README.md                            # replace placeholder
├── CLAUDE.md
├── CHANGELOG.md
├── CONTRIBUTING.md
├── QUALITY-STANDARDS.md
├── docs/
│   └── adr/
│       ├── 0001-blueprints-as-source-of-truth.md
│       ├── 0002-plan-before-execute.md
│       ├── 0003-read-before-edit.md
│       └── 0004-deterministic-ledger-gate.md   # NEW: the Option-A decision + strict-gate delta vs blueprint
└── plugins/
    └── shipwithai-fixkit-core/
        ├── .claude-plugin/
        │   ├── plugin.json              # name, SemVer version (seed 0.1.0), explicit skills[] (relative paths)
        │   └── marketplace.json         # per-plugin: carries BOTH top-level `version` AND `plugins[0].version` — both MUST equal plugin.json.version; source "./"  [G1/M3]
        ├── manifest.json                # lastUpdated + skills[] registry (skillId/name/description/creatorType/enabled)
        ├── CLAUDE.md                    # <200 lines
        ├── README.md
        ├── CHANGELOG.md
        ├── QUALITY-STANDARDS.md
        ├── CONNECTORS.md                # ~~runtime ~~test-runner ~~ci ~~browser ~~source control ~~monitoring + generic defaults
        ├── commands/
        │   └── fix.md                   # orchestrator entry (main thread): intake→classify→select adapter→spawn agent→gate→verify→integrity→close; tracks 3_strikes_count
        ├── skills/
        │   ├── triage/
        │   │   ├── SKILL.md             # Axis-A classifier; user-invocable: true (standalone-usable); ≤200; ends "## What this does NOT do"
        │   │   └── evals/evals.json     # ≥5 prompts (3 trigger / 2 must-not-trigger)
        │   ├── spine/
        │   │   ├── SKILL.md             # VENDORED+CONDENSED systematic-debugging; **user-invocable: false** sub-skill (loaded by fix.md/agents via slash-path); license header; ends "## What this does NOT do"
        │   │   └── evals/evals.json     # ≥5 (3/2 split)
        │   ├── verification/
        │   │   ├── SKILL.md             # §7 matrix enforcer; **user-invocable: false** sub-skill; FULL→run, ASSIST→handoff/v0; forbids closing UI bug on source diff
        │   │   └── evals/evals.json     # ≥5 (3/2 split)
        │   └── regression-guard/
        │       ├── SKILL.md             # leaves layer-appropriate guard artifact; **user-invocable: false** sub-skill
        │       └── evals/evals.json     # ≥5 (3/2 split)
        ├── agents/
        │   ├── ui-bug-agent.md          # frontmatter name/description(+triggers)/model: sonnet/tools[]; embeds spine; ends "## What this agent does NOT do"
        │   ├── logic-bug-agent.md
        │   └── system-bug-agent.md
        ├── lib/
        │   ├── ledger.schema.md         # YAML frontmatter fields + body sections + lifecycle states + transition guards (doc); documents runtime ledgers live in .fixkit/ (committed)
        │   └── ledger-validator.js      # zero-dep Node, two surfaces: validateLedger(snapshot) + applyTransition(ledger,event) → {ok, violations[]}
        ├── tests/
        │   ├── run-all.js               # blueprint CI auto-runs this; snapshot tests (#2) + event-driven transition sims (#3/#4); convention + eval-schema linters; parser unit tests
        │   └── lib/
        │       ├── frontmatter.js       # narrow ledger-schema YAML-subset parser (zero-dep; unit-tested in run-all.js)
        │       └── linters.js           # BLOCKING: line-limits incl. inline-code≤20, "does NOT do" presence, ≥1 user-invocable:false, evals 3/2 split+schema, 4-key version-sync
        └── evals/
            └── fixtures/                # handoff §0.2 fixture home (NOT a real adapter; test scaffolding only)
                ├── stub-adapter/        # (build note: split into buggy/fixed + reproduce/verify per fresh-critic Minor #1, so check #1 is a runnable lifecycle)
                │   ├── README.md        # what this stub fixture simulates (a Logic bug + a test-runner) — NOT a real adapter
                │   ├── buggy.js         # synthetic logic bug in FAILING form (wrong output)
                │   ├── fixed.js         # the fix (smallest change)
                │   ├── reproduce.test.js # runs vs buggy.js → FAILS (the reproduction)
                │   └── verify.test.js   # runs vs fixed.js → PASSES (the verification evidence + guard)
                └── ledger/
                    ├── happy-path.closed.md            # open→reproduced→diagnosed→fixed→verified→closed → validateLedger ACCEPTS (check #1)
                    ├── neg-integrity.empty-evidence.md # closed + evidence "" → validateLedger REJECTS (INTEGRITY_EVIDENCE_EMPTY) — invariant (check #2)
                    ├── seed-ironlaw.no-rootcause.md    # diagnosed-ish ledger, root_cause "" → applyTransition(enter_fixed) REFUSED (IRON_LAW_FIX_BEFORE_ROOT_CAUSE) — guard (check #3)
                    ├── seed-3strikes.diagnosed.md      # clean ledger; test applies recordFixFailure ×3 → 3rd fires →escalated (THREE_STRIKES_NO_ESCALATION if not) — guard (check #4)
                    ├── neg-assist.closed.md            # capability_tier ASSIST + closed → REJECTS (ASSIST_CANNOT_CLOSE) — invariant
                    └── neg-layerproof.ui-on-diff.md    # symptom_layer UI + method source-diff + closed → REJECTS (VERIFICATION_LAYER_MISMATCH) — invariant
```

**Per-skill evals only (G2):** the four skills each carry `skills/<name>/evals/evals.json` (≥5, with the 3-trigger/2-must-not split). The earlier plugin-root `evals/evals.json` is **dropped** — blueprint CI's `find` only descends `skills/` (validate-plugin.yml:71), so a root file is invisible to CI and non-conventional. This retires risk R7.

**Note on P1+ plugins:** Blueprint CI does not require sibling plugins to be listed (validate-plugin.yml:107–116 only *warns*). Phase-0 root `marketplace.json` registers **only** `shipwithai-fixkit-core`; the five adapters are documented in README "build order," not registered (phantom dirs would fail the REQUIRED-files check). Architect confirmed this is correct — keep it.

---

## 2. How the Phase-0 gate becomes deterministically testable in CI (the key decision)

**Mechanism (Option A above):** a code adjudicator + fixtures, wired into the blueprint's existing Node test hook.

### 2.1 The state machine (`lib/ledger-validator.js`) — two surfaces, one rule set
- `validateLedger(snapshot) → {ok, violations[]}` — static **invariant** auditor (used for checks #2 + the two honesty invariants, and to audit any committed `.fixkit/` ledger).
- `applyTransition(ledger, event) → {ok, ledger', violations[]}` — the **transition guard** the orchestrator's gate step calls. Events: `enter_fixed`, `record_fix_failure`, `enter_verified`, `close`, … Each event checks the guard *before* mutating, returning `{ok:false, violations}` if refused.

Rules, by category (each carries a stable `code`):

**Invariants** (snapshot-checkable):
- **Integrity** (`INTEGRITY_EVIDENCE_EMPTY` / `INTEGRITY_VERIFIER_MISSING`): `state == closed` ⇒ `verification.evidence` non-empty AND `verification.verified_by` named. → check #2.
- **ASSIST ceiling** (`ASSIST_CANNOT_CLOSE`): `verification.capability_tier == ASSIST` ⇒ `state != closed` (max `candidate`). "No runner → no auto-close → handoff/v0." **Non-optional** (handoff §4 honesty bar).
- **Layer-proof binding** (`VERIFICATION_LAYER_MISMATCH`): `verification.method` must match `symptom_layer`'s required proof (a UI bug cannot close on `source-diff`). **Non-optional** (handoff §4). 

**Transition guards** (event-checkable — the faithful test of #3/#4):
- **Iron Law** (`IRON_LAW_FIX_BEFORE_ROOT_CAUSE`): `applyTransition(ledger, enter_fixed)` is **refused** unless `root_cause` is non-empty. The FIX state is *unreachable* without root cause — tested as a guarded transition, not a residue. → check #3.
- **3-strikes** (`THREE_STRIKES_NO_ESCALATION`): `applyTransition(ledger, record_fix_failure)` increments `3_strikes_count`; on the **3rd** application it *fires* `state → escalated` (and refuses any non-escalated next state). → check #4.
- Legal-order guard: each `enter_*`/`close` event refuses if its predecessor state isn't satisfied.

### 2.2 The fixtures (`evals/fixtures/ledger/`)
Committed ledger files (auditable, prereq #2). Invariant fixtures (happy-path, empty-evidence, assist-closed, ui-on-diff) are static snapshots fed to `validateLedger`. Guard *seeds* (no-rootcause, diagnosed-clean) are starting states the runner mutates via `applyTransition` events.

### 2.3 The runner (`tests/run-all.js`) — the deterministic gate
`node tests/run-all.js` (exit 0 = green) performs:
1. **Happy path (#1)** — `validateLedger(happy-path.closed.md)` ACCEPTS; the ledger is the produced artifact shown as evidence.
2. **Integrity invariant (#2)** — `validateLedger(empty-evidence-closed)` REJECTS with `INTEGRITY_EVIDENCE_EMPTY` (fails-as-expected).
3. **Iron-Law guard (#3)** — from `seed-ironlaw.no-rootcause.md`, `applyTransition(ledger, enter_fixed)` is **refused** with `IRON_LAW_FIX_BEFORE_ROOT_CAUSE`. Tests the *gate*, not the aftermath.
4. **3-strikes guard (#4)** — from `seed-3strikes.diagnosed.md`, apply `record_fix_failure` ×3; assert (a) the counter reached 3 *via the function* and (b) the 3rd application *fired* `state → escalated`. This exercises the increment-and-escalate logic — a system that never increments or never escalates **fails** this test (it cannot pass green-by-construction).
5. **Honesty invariants** — `validateLedger` REJECTS `neg-assist.closed.md` (`ASSIST_CANNOT_CLOSE`) and `neg-layerproof.ui-on-diff.md` (`VERIFICATION_LAYER_MISMATCH`).
6. **Parser unit tests** — `frontmatter.js` round-trips the known schema edge cases (empty string vs null `evidence`, quoted vs unquoted `3_strikes_count`, nested `verification:` object) so a parser bug cannot produce a false green.
7. **Convention + eval-schema linters** (all BLOCKING — non-zero exit, *replacing* the blueprint's `::warning::`+exit-0 semantics; the ported `validate-plugin.yml` keeps warnings, the *blocking* lives in `run-all.js`):
   - **"does NOT do":** every `skills/**/SKILL.md` and `agents/*.md` ends with `## What this … does NOT do`.
   - **Line limits as errors:** SKILL.md <200, references <150, bundles <500, descriptions <200 chars, **and inline-code ≤20** (M1: count consecutive lines inside any fenced ```` ``` ```` block in a SKILL.md; >20 → error).
   - **Composition (M2):** assert ≥1 skill has `user-invocable: false` (proves check #7's sub-skill convention is exercised; `spine`/`verification`/`regression-guard` carry it; `fix.md`/`triage` dispatch them by slash-path).
   - **Eval schema:** each skill's `evals.json` has ≥5 objects with the **3-trigger / 2-must-not-trigger** split and `{id, prompt, expectedBehavior, category}` shape.
   - **Version sync (M3 — 4 keys, all equal):** `plugin.json.version` == per-plugin `marketplace.json` **top-level** `version` == per-plugin `marketplace.json` `plugins[0].version` == root `marketplace.json` `plugins[name==core].version`. (Note: the live `auth` reference is itself out of sync — do **not** copy its version values, only its shape.)

**Why this is the right mechanism:** (a) fully deterministic — same inputs, same exit code, no model/network; (b) self-documenting — fixtures show the rules by example; (c) zero CI surgery — blueprint already runs `tests/run-all.js`; (d) the verification seam — Phase-1 hard-locks add `hard_lock_violations` rules + events to the *same* state machine and fixtures to the *same* runner; (e) **faithful** — #3/#4 drive *events* and prove the guards fire, not merely that a hand-written bad end-state is rejected. The same `applyTransition` rule-codes are cited by `commands/fix.md`, so runtime and tests share one state machine (§5).

### 2.4 Scope of validation — what is enforced vs documented-only (Phase 0)
- **`guard` field** — present in the schema; Phase-0 validator records it but does **not** gate on its content (guard *artifact* production is the `regression-guard` skill's job; deferred as a hard rule to Phase 1). Stated explicitly so it is not mistaken for an untested-but-claimed rule.
- **`root_cause_layer` (Axis B) / B≠A re-dispatch** — schema field exists; the re-dispatch path is **runtime/model behavior**, not snapshot-testable, so Phase 0 documents it (in `triage`/`fix.md`) but adds no validator rule or fixture. Phase-1 live bugs (esp. Bug 1, the design-organism case) exercise it.
- **`.fixkit/` semantics** — `.fixkit/` is the **committed runtime ledger directory in a *consuming* project**, documented in `lib/ledger.schema.md`. The Phase-0 *plugin repo* does **not** ship a `.fixkit/`; its committed ledgers are the **test fixtures** under `evals/fixtures/ledger/`. `validateLedger` is the auditor a consuming project would run over its `.fixkit/*.md`. (Resolves the Critic's `.fixkit/`-seeding ambiguity: no empty dir is seeded in the plugin repo.)

**Bounded fidelity gap (named, per Architect):** the validator proves the *invariant + guard logic* deterministically. It does **not** prove the model-driven orchestrator loop executes that logic end-to-end — that is irreducibly non-deterministic in CI and is deferred to the **Phase-1 live-bug gate** (doc 10 §P1, the three real `shipwithai.io` bugs). Phase 0 bounds the gap by having `fix.md` cite the same rule-codes the validator enforces, so prose and code share one vocabulary.

---

## 3. Vendored spine embedding + attribution

- **Source:** `superpowers:systematic-debugging` v5.1.0, `…/skills/systematic-debugging/SKILL.md` (296 lines), **MIT © 2025 Jesse Vincent** (license text read from the upstream `LICENSE`).
- **Embedding:** `skills/spine/SKILL.md` is a **condensed adaptation** (upstream 296 > 200-line limit). It preserves the **Iron Law** string **verbatim** ("NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST") and the "≥3 failed fixes → question the architecture" discipline (verbatim-preservable from upstream), while the **6-token spine** (REPRODUCE→ISOLATE→DIAGNOSE→FIX→VERIFY→GUARD) is fixkit's own vocabulary — a re-expression of upstream's 4-phase structure (Root-Cause Investigation / Pattern Analysis / Hypothesis-and-Testing / Implementation), **not** a verbatim heading copy (m1). The rest is re-expressed in fixkit's layer/ledger vocabulary.
- **Attribution (two places, per prereq #5):**
  1. A **license header** comment block at the top of `skills/spine/SKILL.md` (after frontmatter): credits the upstream skill, states "Adapted from", names the MIT license + copyright holder, links the source.
  2. A top-level **`NOTICE`** file reproducing the **full upstream MIT license text** verbatim and crediting `superpowers:systematic-debugging`.
- This is "vendor, don't reinvent": the spine discipline is copied into the repo (not pulled at runtime), with provenance preserved so upstream improvements can be folded manually later.

---

## 4. Mechanized vs judgment vs live-UI (so no work is doubled)

| Check | Owner | How |
|---|---|---|
| Happy-path lifecycle reaches `closed` legally | **Mechanized (CC)** | `tests/run-all.js` happy fixture |
| Integrity guard blocks empty-evidence close | **Mechanized (CC)** | negative fixture #2 |
| Iron-Law blocks fix-before-root-cause | **Mechanized (CC)** | negative fixture #3 |
| 3-strikes *fires* escalation (event-driven) | **Mechanized (CC)** | `record_fix_failure` ×3 simulation (#4) |
| ASSIST cannot auto-close / layer-proof binding | **Mechanized (CC)** | validator invariants + dedicated fixtures (**non-optional**, handoff §4) |
| Line limits, ≥5 evals (3/2 split), tri-file version sync, "does NOT do" presence, JSON validity, eval object schema | **Mechanized (CC)** | linters in `tests/run-all.js` + ported `validate-plugin.yml` |
| Spine fidelity, prompt quality of skills/agents, classifier soundness, seam placement for hard-locks, "smallest change" discipline as written | **Judgment (fresh critic subagent + Cowork)** | critic refutation pass; Cowork independent review of fixtures + negative-test definitions |
| Quality matrix ≥7.0 scoring | **Judgment (fresh critic + Cowork)** | scored breakdown by the *critic* (worker ≠ grader), Cowork confirms |
| Live-UI (color/spacing/overflow/hydration/console) | **N/A in Phase 0** | no rendered surface exists; explicitly out of scope until Phase 1 web adapter |

This split is explicit so Cowork's independent confirmation targets *only* the judgment + fixture-review lane and does not re-run the mechanized lane.

---

## 5. Hard-locks seam (note only — NOT built in Phase 0)

The state machine and `commands/fix.md` step 8 ("Fix — hard-locks checked first") expose a **pre-fix validation hook** and a ledger field `hard_lock_violations: []`. Crucially, `fix.md`'s gate/verify/close steps **cite the validator's rule-codes by name** (`IRON_LAW_FIX_BEFORE_ROOT_CAUSE`, `INTEGRITY_EVIDENCE_EMPTY`, `THREE_STRIKES_NO_ESCALATION`, `ASSIST_CANNOT_CLOSE`, `VERIFICATION_LAYER_MISMATCH`) so the prose orchestrator and the code validator share **one rule vocabulary** — bounding the prose-vs-code drift the Architect flagged. Phase-1/pack overlays will: (a) add hard-lock rules (AD-027 `data-surface`, URL immutability, Emerald Subscribe, JBM-only) as additional `applyTransition` checks keyed off `hard_lock_violations`, and (b) supply a `pre-fix-validation` recipe via the adapter contract. Phase-0 builds the *empty seam* (the field + the documented hook point + the shared rule-code vocabulary), not the org-specific rules.

---

## 6. Risks / unknowns to resolve before execution

- **R1 — Blocking vs warning line limits.** Blueprint treats limits as *warnings*; handoff §3.5 wants CI *green* on them. **Proposed:** fixkit makes them **blocking** in its own `tests/run-all.js` (a documented superset, ADR-0004). *Confirm Cowork accepts stricter-than-blueprint.*
- **R2 — `## What this does NOT do` is a new convention** (absent in blueprint plugins). **Proposed:** fixkit introduces + lints it (ADR-0004). *Confirm.*
- **R3 — YAML parsing strategy — RESOLVED to zero-dep, no `package.json`.** The blueprint CI hook is `npm install --ignore-scripts` then `node tests/run-all.js` (validate-plugin.yml:170–171) — there is **no `npm ci`**. A `js-yaml` fallback would require a committed `package.json`+lockfile and contradict "zero CI surgery." **Decision:** ship a narrow, schema-specific frontmatter parser with **no dependencies and no `package.json`**, and retire the fragility risk *now* via parser unit tests in `tests/run-all.js` (R3 no longer deferred). Honors blueprint security rule `--ignore-scripts --save-exact` (CLAUDE.md:118) by having no deps at all.
- **R4 — Spine condensation.** Upstream is 296 lines; the 200-line limit forces adaptation, not verbatim copy. Risk: under-preserving discipline or over-trimming attribution. **Proposed:** keep Iron Law + phase names + 3-strikes verbatim; `NOTICE` carries full MIT license text. *Critic to judge fidelity.*
- **R5 — Guard fidelity — RESOLVED (Architect).** Checks #3/#4 are **transition guards**, not snapshot invariants. The runner drives *events* (`applyTransition`): #3 attempts `enter_fixed` on a no-root-cause ledger and asserts refusal; #4 applies `record_fix_failure` ×3 and asserts escalation *fires* on the 3rd. Snapshot validation (`validateLedger`) is retained only for genuine invariants (#2, ASSIST-ceiling, layer-proof) and for auditing committed `.fixkit/` ledgers. *Closes the green-by-construction hole.*
- **R6 — Repo is not yet a git repo and has no GitHub remote.** Deliverable §7 says "a PR." **Proposed:** `git init` + branch **`phase-0/fixkit-core`** + local commit; open PR if a remote is configured, else write the PR body to **`.omc/plans/PR-BODY.md`** (carrying all §3 evidence) and HALT for Ethan on push/remote. *Confirm remote/PR mechanics — this is the one open question I want Ethan to settle.*
- **R7 — RESOLVED (dropped).** Per-skill `evals/evals.json` (≥5, 3-trigger/2-must-not split) only; the plugin-root evals file is removed (invisible to CI `find`, non-conventional). No over-build.
- **R8 — Quality matrix ≥7.0 is judgment.** Scored by the **fresh critic** (worker ≠ grader) + Cowork. Risk of self-grading; mitigated by separate critic context. *Confirm Cowork is the tiebreaker.*

---

## 7. Execution sequence (post-approval, autonomous to PR)

1. `git init`; branch `phase-0/fixkit-core`; scaffold repo-level files (marketplace, CI, NOTICE, docs/ADRs, top-level md).
2. Author `shipwithai-fixkit-core`: schema doc → `ledger-validator.js` (`validateLedger` + `applyTransition`) + frontmatter parser → fixtures → runner/linters. **TDD:** write fixtures + transition tests first, watch them fail, then make the state machine green.
3. Author skills (spine condensed + triage + verification + regression-guard; `user-invocable:false` on the three sub-skills), agents, `commands/fix.md` (citing validator rule-codes), `manifest.json` (trigger phrases ride in each skill `description`, per blueprint shape), CONNECTORS, per-skill evals — each skill/agent ending with `## What this … does NOT do`.
4. Run `node tests/run-all.js` + the ported `validate-plugin.yml` locally; paste full output as §3-gate evidence.
5. **Fresh critic subagent** refutation pass (separate context, worker≠grader) → record verdict + quality-matrix ≥7.0 score breakdown.
6. CHANGELOG + 4-key version sync; write PR body to `.omc/plans/PR-BODY.md` with all §3 evidence + critic refutation record.
7. **HALT** for Ethan's PR-out approval (open the PR only if a remote is configured).

---

## ADR (for final plan)
- **Decision:** Deterministic Phase-0 gate via a zero-dep Node ledger-state validator + committed YAML fixtures, run by `tests/run-all.js`; fixkit extends the blueprint with blocking limits, ≥5 evals, and the `## What this does NOT do` convention (ADR-0004).
- **Drivers:** determinism (handoff §0.2), blueprint conformance, Phase-1 seam.
- **Alternatives:** Python validator (CI-convention divergence); bash harness (nested-YAML brittleness). Both rejected.
- **Consequences:** Repo carries a small JS test surface (justified — it is the trust anchor); strict-superset CI; fixtures double as rule documentation.
- **Follow-ups:** Phase-1 adds hard-lock rules + fixtures to the same validator/runner; revisit `js-yaml` if the narrow parser proves fragile (R3).
