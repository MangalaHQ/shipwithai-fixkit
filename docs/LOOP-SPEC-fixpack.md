# LOOP SPEC — shipwithai-fixkit: the Fix-Pack Loop

> **Tier: FOCUS** (the filled LOOP SPEC for one harness × one work-class).
> Lead repo: **shipwithai-fixkit** (`plugins/shipwithai-fixkit-core`).
> Pairs with the general method: `../../shipwithai-playbook/loops/00-loop-adoption-playbook-en.md`.
> Registered in: `../../shipwithai-playbook/loops/LOOP-INDEX.md` (fix-pack row).
> Grounded in a real Phase-0 run — see §9. All artifacts English (fixkit CLAUDE.md).
> Created: 2026-06-30.

## 0. The pain, named

The most expensive recurring ritual in this repo is **fixing a bug correctly without
self-deception**: remembering the `REPRODUCE → ISOLATE → DIAGNOSE → FIX → VERIFY → GUARD`
checklist, and — the part humans and eager agents skip — refusing to call a bug "done"
until there is **layer-appropriate proof** the fix actually holds. The failure class the
fixkit harness was built to kill is the **premature close**: a fix marked done on a source
diff, an empty-evidence close, a fix written before the root cause is known. A loop runs the
checklist for you and **cannot close** on anything the deterministic guard rejects.

## 1. The loop in one picture

```
            ┌──────────────── .fixkit/BUG-*.md  (the spine / ledger) ────────────────┐
            │ frontmatter state machine, one file per bug:                            │
            │ triaged → reproduced → isolated → diagnosed → fixed → candidate →       │
            │ verified → closed   (or → escalated after 3 strikes)                    │
            └────────────────────────────────────────────────────────────────────────┘
  TRIAGE ───► REPRODUCE ───► DIAGNOSE ───► FIX ───► VERIFY ───► GUARD ───► CLOSE
  maker: triage  maker: layer-agent (ui/logic/system) writes repro→fix     maker: regression-guard
  gate: Axis-A   gate: reproduce.test FAILS on buggy   gate: applyTransition refuses     gate: validateLedger
        routed         (the bug is real)                 fix-before-root_cause,                ACCEPTS
                                                         ASSIST-close, layer mismatch,         (closed +
                                                         empty evidence, unresolved            evidence +
                                                         hard_lock_violations                  verified_by)
        (advance a stage ONLY on its gate; the checker is the validator, never the maker)
```

It is a **pipeline loop**: stages run in series and a single bug may loop within a stage
(up to the 3-strikes cap) until that stage's gate passes. The whole machine sits on **one
deterministic trust anchor**, `lib/ledger-validator.js`, which is exercised by the Phase-0
gate `node tests/run-all.js`.

## 2. Verifiable stop conditions — the real gates

Two layers of "done", both machine-checkable. Never the maker's own claim.

| Scope | "Done" means (verifiable) | Real command / surface |
|---|---|---|
| **Harness self-test** (the meta-gate) | the validator + every guard + linter is green; negatives bite | `cd plugins/shipwithai-fixkit-core && node tests/run-all.js` → **exit 0** |
| **Per-bug close** (one Instance) | ledger entry reaches `state: closed` AND the snapshot is ACCEPTED: non-empty evidence, `verified_by` present, `fix` recorded, layer-proof binding matches symptom layer, `hard_lock_violations` empty, 3-strikes consistent | `validateLedger(snapshot)` ACCEPTS; `applyTransition(ledger, close)` does not refuse |
| **Reproduce gate** | the bug is genuinely reproduced before any fix | `reproduce.test.js` **FAILS** on `buggy.js` (exit 1) |
| **Verify gate** | the fix genuinely holds | `verify.test.js` **PASSES** on `fixed.js` (exit 0) |

The anti-pattern to refuse: *"loop until the bug looks fixed."* Replace with: *"loop until
`validateLedger` ACCEPTS the closed snapshot AND `reproduce` failed-before / `verify`
passes-after,"* capped at 3 strikes per bug.

## 3. Maker / checker — your checker is already deterministic

The single biggest head start: the checker side is **already a zero-dependency Node trust
anchor**, separate from every maker. You wire it; you do not build it.

| Stage | Maker (writes the fix) | Checker (verifies, separate) |
|---|---|---|
| TRIAGE | `triage` skill (Axis-A routing) | — (routing only) |
| REPRODUCE | layer-agent: `ui-bug-agent` / `logic-bug-agent` / `system-bug-agent` | `reproduce.test.js` must FAIL on buggy code |
| DIAGNOSE → FIX | the same layer-agent, in isolated context | `applyTransition` — Iron-Law (`FIX_NOT_RECORDED`, fix-before-`root_cause` refused), hard-lock pre-fix guard |
| VERIFY | the layer-agent records `verification{method, evidence, verified_by}` | `validateLedger` — layer-proof binding (`VERIFICATION_LAYER_MISMATCH`), `ASSIST_CANNOT_CLOSE`, `INTEGRITY_EVIDENCE_EMPTY` |
| GUARD | `regression-guard` skill writes a pinning test | the guard test itself (re-runs green) |
| CLOSE | — | `applyTransition(…, close)` + critic self-review (worker ≠ grader, per CLAUDE.md) |
| (cross-bug) | `pattern-mining` skill + `pattern-learning` agent | structural scope-token clustering test |

The Part-3 rule holds: the checker's entire value is that it is **not** the maker. The
validator runs *before* mutating state (`applyTransition` checks, then transitions), so the
Iron-Law and 3-strikes negatives test the transition, not a residue.

## 4. The spine — `.fixkit/` ledger

One greppable markdown file per bug, frontmatter as the state machine. Buckets = the
lifecycle states; the resume anchor is whatever `state:` each file currently holds.

```markdown
# .fixkit/BUG-007-astro-build-og-dirname.md  (one Instance)
---
id: BUG-007
symptom_layer: System
state: closed            # the resume anchor — read fresh, written each run
root_cause: "…"          # Iron-Law: must be non-empty before enter_fixed
fix: "…"                 # FIX_NOT_RECORDED if empty at verify/close
3_strikes_count: 0       # → escalated at 3
verification:
  method: integration-test
  capability_tier: FULL  # ASSIST tier cannot close
  evidence: "…"          # INTEGRITY_EVIDENCE_EMPTY if empty
  verified_by: "system-bug-agent"
hard_lock_violations: [] # must be empty before enter_fixed (Phase-1 seam)
guard: "tests/…"         # the regression pin
---
```

It survives a dead session: kill mid-fix, reopen, and the `state:` field of each
`.fixkit/BUG-*.md` tells you exactly which stage is next — that is the **resume test**.
The ledger is the single source of truth (ADR-0004); do not duplicate it elsewhere.

## 5. The cap — 3 strikes is built in, plus the usual ceilings

Three hard stops on every automated bug:

- **3-strikes escalation (native).** After 3 failed fix attempts the state machine fires
  `→ escalated` and refuses to keep banging; a `count >= 3` without escalation is itself
  rejected. This is the loop's built-in stall detector.
- **`/goal` ceilings.** When you wrap a stage in `/goal`, add `--max-turns`, `--max-cost`,
  `--max-duration`.
- **ASSIST ceiling.** An ASSIST-tier verification can never auto-close — it must hand off
  to a human or a higher-capability run.

The true ceiling is your review bandwidth: run at most as many bug-lanes as you can merge in
a day. **Merge stays human, always.**

## 6. The heartbeat — the target shape

Phase 0–2 are manual / `/goal`. The destination heartbeat is a **scheduled triage**:

- A scheduled run scans an inbox (gap-log, issue tracker, failing CI) for new bugs and opens
  a `.fixkit/BUG-*.md` ledger entry in `triaged` for each.
- New entries route to a human queue; the loop runs `/fix` per bug up to the 3-strikes cap.
- A run that finds nothing writes "no new bugs" and archives cheap.
- **Never auto-merge a fix** — a `verified` ledger entry is a PR a human approves.

## 7. Retrofit step by step (Phase 0 → 3)

Climb the ladder; do not jump to scheduled autonomy.

- **Phase 0 — manual gate (done, §9).** Run `node tests/run-all.js`; confirm a clean green
  and that the negatives bite. ✅ exit 0, 99 checks (this run).
  Re-run 2026-07-18 (Wave-2 W2-D, at commit time of this spec): exit 0, 99 checks green.
- **Phase 1 — the spine is the ledger.** Drive one real bug through `.fixkit/BUG-*.md`,
  writing each stage's `state:`. Kill mid-pipeline, reopen, confirm you can name the next
  stage from the file alone (resume test). The fixkit ledger already does this — the
  shipwithai.io `.fixkit/` (BUG-001…007) and `fixkit-fe-astro/.fixkit/` are live spines.
- **Phase 2 — `/goal` with the validator as checker.** Wrap the FIX→VERIFY span:
  `/goal validateLedger ACCEPTS the closed snapshot for BUG-XXX AND verify.test passes` —
  capped with `--max-turns`. The layer-agent iterates; the validator (not the agent) decides
  done. The 3-strikes negative is the natural stop.
- **Phase 3 — scheduled triage heartbeat (§6).** Promote triage to a cron/Routine/CI job →
  findings to a human inbox → caps + "no findings → archive cheap". Never auto-merge.

## 8. Caveats — read before you loop

- **The validator is the trust anchor.** Any change to `lib/ledger-validator.js` or
  `tests/run-all.js` is **tests-first** and mutation-checked to bite; never weaken a guard
  without a replacement (CLAUDE.md). A loop must not edit its own checker to make itself pass.
- **Phase boundaries.** Adapters, the pack, real hard-locks (AD-027 etc.), live connectors
  are **Phase 1+**. The core loop only wires the seams (`hard_lock_violations`, the pre-fix
  hook, shared rule-codes). Do not let a loop build Phase-1 surface inside core.
- **Stack-agnostic core.** `shipwithai-fixkit-core` is MIT and stack-neutral; org-specific
  packs (`-focus`, `-design`) and adapters inherit this gate with their own fixtures — the
  same `run-all.js` stop condition, re-filled, not reinvented.
- **Merge stays human** — especially when the consuming repo is `shipwithai.io` (URL
  immutability) or any repo with visual-identity hard-locks.

## 9. Proof this isn't theory (Phase 0, real run — 2026-06-30)

```
$ cd plugins/shipwithai-fixkit-core && node tests/run-all.js ; echo EXIT=$?
…
PASS — 99 checks green. Phase-0 gate satisfied.
EXIT=0
```

The gate ran for real on Node v22 and the **negatives bit** — proof the checker is a checker,
not a rubber stamp:

- §2 happy-path: `reproduce.test.js` FAILS on `buggy.js`, `verify.test.js` PASSES on `fixed.js`.
- §3 integrity: empty-evidence close **REJECTED** (`INTEGRITY_EVIDENCE_EMPTY`).
- §4 Iron-Law: `enter_fixed` **REFUSED** while `root_cause` empty; allowed once present.
- §5 3-strikes: escalation fires on the 3rd failure; `count >= 3` without escalation rejected.
- §6 honesty: `ASSIST_CANNOT_CLOSE`; UI bug cannot close on a source-diff
  (`VERIFICATION_LAYER_MISMATCH`).

What this run could **not** prove (the honest boundary, per Part 7): end-to-end orchestrator
fidelity — that the model-driven maker loop reproduces/diagnoses/fixes a *new live bug*
correctly. The validator being green ≠ the model loop being correct (ADR-0004 names this gap).
Phase 1 on a real bug in a consuming repo closes it. That is the next rung, not this spec.

## LOOP SPEC table (the canonical seven rows)

| Row | Value |
|---|---|
| **Ritual** | Fix a bug through `REPRODUCE→ISOLATE→DIAGNOSE→FIX→VERIFY→GUARD` without a premature close |
| **Stop condition** | `node tests/run-all.js` exit 0 (harness) **and** `validateLedger` ACCEPTS the `closed` snapshot (per-bug) |
| **Maker** | `/shipwithai-fixkit-core:fix` → `spine` skill + layer-agents (`ui`/`logic`/`system-bug-agent`) |
| **Checker** | `lib/ledger-validator.js` (`validateLedger` + `applyTransition`) + critic self-review (worker ≠ grader) — never the maker |
| **Spine** | `.fixkit/BUG-*.md` ledger frontmatter state machine (+ `handoffs/*.json`) |
| **Cap** | native 3-strikes → `escalated`; plus `/goal --max-turns/--max-cost/--max-duration`; ASSIST cannot close |
| **Heartbeat target** | manual `/fix` now → scheduled triage of an inbox → human queue (Phase 3) |
| **Caveats** | validator is trust anchor (change tests-first); Phase-1 surface stays out of core; merge stays human |
