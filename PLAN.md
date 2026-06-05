# PLAN.md — Phase 5: distribution + pattern-learning agent

> **Status:** awaiting Ethan's approval (ADR-0002 — PLAN first, then autonomous to PR).
> **Author:** Claude Code. **Approver:** Ethan. **Spans BOTH repos** (engine + focus) + reads one
> real data dir (`shipwithai.io/.fixkit/`, **read-only**).
> **The point of this phase:** ship the family (engine public/MIT, focus private, cross-repo install
> proven) **and** close the loop on history — a read-only agent that mines the append-only `.fixkit/`
> ledgers (dedupe + frequency threshold, the playbook-monitor idiom) and **proposes** recurring-bug
> playbook entries (a human reviews; the agent never writes a ledger and never auto-applies).
> **Branches:** engine `phase-5/distribution-pattern-learning` off `main` @ `1e0b38d` (post-PR #5,
> six plugins live); focus `phase-5/distribution` off `master` @ `4f866d2`.
> **New capability is additive + read-only:** zero edits to any guard (`lib/ledger-validator.js`,
> `lib/handoff-validator.js`); the miner only *reads* ledgers. Core bumps **minor** (0.2.0 → 0.3.0).

---

## 0. Context established (evidence, not assumptions)

Read on-demand per the handoff's token budget; findings that shape the design:

- **Ledger data shape** (`lib/ledger.schema.md` + the 4 real ledgers): frontmatter carries
  `id, symptom_layer, subtype, severity, state, root_cause, root_cause_layer, fix,
  verification{…}, guard`. The body is narrative; **frontmatter is the machine-checked truth**.
- **The real corpus is 4 ledgers, not 5** — `shipwithai.io/.fixkit/` holds **BUG-001, 003, 004, 005**
  (there is no BUG-002). This matters for the gate-run threshold maths (§7).
- **The recurring pattern is real and has a built-in negative control:**
  | Bug | symptom/subtype | `root_cause_layer` | design-organism? |
  |---|---|---|---|
  | BUG-001 | UI / layout-spacing | **upstream** | **yes** — `@shipwithai/design` ArticleHero organism |
  | BUG-003 | UI / layout-overflow | UI | **no** — explicitly "a consumer component, **not** a design organism" |
  | BUG-004 | UI / interaction-client-runtime | UI | **yes** — `@shipwithai/design` ReactionsBar organism (consumer never wired) |
  | BUG-005 | UI / interaction-contract | UI | **yes** — `@shipwithai/design` ReactionsBar organism (first-`<article>` assumption) |

  → A **design-organism assumption cluster of 3** (001, 004, 005) surfaces at threshold 2, and
  **BUG-003 is the negative control that must stay out** (consumer-local root cause). Crucially,
  these three do **not** share `root_cause_layer` (upstream vs UI) **nor** `subtype` — so a naive
  `root_cause_layer + subtype` key would *split* them. **The binding signal is normalized
  root-cause tokens** (`@shipwithai/design`, "organism"). This dictates the matching-key design (§2).
- **The parser to reuse exists but lives under `tests/`:** `tests/lib/frontmatter.js`
  (`parseFrontmatter`, `parseScalar`) — a zero-dep YAML-subset parser. `lib/ledger-validator.js`
  has **no** parser (it audits already-parsed objects). A core `lib/pattern-miner.js` must not
  depend on `tests/`; the parser is promoted to `lib/` (§2, with a re-export shim to keep the
  gate's require untouched).
- **The gate auto-discovers + lints** every `skills/<s>/SKILL.md` (<200 lines, inline ≤20,
  ends `## What this … does NOT do`, description <200) and requires `skills/<s>/evals/evals.json`
  with **≥5 evals (≥3 trigger / ≥2 must-not, `shouldTrigger` boolean)**; agents are checked for the
  `## What this agent does NOT do` h2. The new sub-skill + agent inherit all of this automatically.
- **Public-readiness — headline finding:** **there is NO `LICENSE` file anywhere in the engine**
  (root or per-plugin) — only `NOTICE` (which correctly carries the vendored-spine attribution:
  superpowers:systematic-debugging, MIT © 2025 Jesse Vincent, + the engine's own
  "Copyright (c) 2026 ShipWithAI"). README/CLAUDE.md both declare MIT. **The audit's item #1 fails
  today** → remediation = add a root MIT `LICENSE` (2026 ShipWithAI). This is a docs/licensing
  change (no code behavior), within the audit's remediation lane.
- **Focus CI has the exact PR #3 silent-skip bug:** focus `.github/workflows/validate-plugin.yml`
  uses `git diff --name-only origin/${{ github.base_ref }}...HEAD` with **no `fetch-depth: 0`** and
  **no fail-loud** — identical to the bug PR #3 fixed in the engine. Port the engine's fixed version.
- **Focus pin is stale (P2-era):** focus root `marketplace.json` pins engine **core@0.2.0 + web@0.1.0
  by sha `2f8e0e8`** (P2). It lists only pack + core + web (focus is a web org). Re-pin to the
  post-P5-merge engine `main` SHA; bump core 0.2.0 → 0.3.0 in the pinned entry; web stays 0.1.0
  (sha moves). Update `_pin_note`.
- **Config profile = the pack `CLAUDE.md`** (doc 09 §10 confirmed): the focus pack
  `plugins/shipwithai-fixkit-pack/CLAUDE.md` is the "tunables SSOT" (dev_command, hard-locks,
  quality thresholds, gap-log glob). This is where the mining frequency threshold tunable belongs
  — **but the pack lives in the private focus repo; core (public) cannot depend on it** (§2 seam).

---

## 1. Decisions locked by Ethan (2026-06-05) — honored as-is

| # | Decision | How this PLAN honors it |
|---|---|---|
| 1 | Engine → PUBLIC in P5 | CC runs the audit + prepares remediation; **Ethan** flips visibility (`gh repo edit`) after audit passes + approval. CC never flips. |
| 2 | Focus remote = `MangalaHQ/shipwithai-fixkit-focus`, private; `master`→`main`, default `main` | CC prepares the rename + sweep + re-pin; **Ethan/CC push at PR-out**. |
| 3 | Pattern corpus = real `shipwithai.io/.fixkit/` (BUG-001…005), read-only; gate-run in-phase | The agent reads it read-only; the in-phase gate-run is §7 acceptance #5. |
| 4 | P2–P4 real-bug gates still open, separately tracked | Out of scope here (§9). |

---

## 2. Engine deliverable A — the pattern-learning capability (the only new behavior)

**Where it lives (proposal — justified):** a core `agents/pattern-learning.md` + a
`user-invocable:false` `skills/pattern-mining/` sub-skill + a zero-dep `lib/pattern-miner.js`.
This mirrors the existing core idiom (flat-`.md` agents, `user-invocable:false` sub-skills, zero-dep
`lib/` trust code) and keeps the *capability* in the public engine while the *org thresholds* stay
in the private pack.

### 2.1 `lib/pattern-miner.js` (zero-dep, pure functions)
- **Input:** a `.fixkit/` directory path (or an array of pre-parsed ledger objects, for tests).
- **Parser reuse:** promote `tests/lib/frontmatter.js` → **`lib/frontmatter.js`** (the real impl),
  and leave `tests/lib/frontmatter.js` as a one-line **re-export shim**
  (`module.exports = require('../../lib/frontmatter')`) so the gate's existing `require` and the
  parser unit tests are untouched (minimal blast radius; rollback = delete the shim, revert the move).
- **Matching key (the crux — keyed on normalized root-cause tokens, NOT just layer+subtype):**
  for each ledger, derive a **signature** = the set of *salient normalized tokens* extracted from
  `root_cause` (lowercased; stopword-stripped; package refs like `@scope/pkg` preserved as atomic
  tokens; plus a small controlled vocabulary signal e.g. `organism`, `hydration`, `selector`,
  `overflow`). Two bugs **match** when their signatures share ≥ K salient tokens **including ≥1
  "scope" token** (a package ref or component/organism noun) — this is what unites 001/004/005 on
  `@shipwithai/design` + `organism` while keeping 003 (consumer, no design-package token) out.
  Secondary grouping facets recorded for the report: `symptom_layer`, `subtype`, `root_cause_layer`.
  *(Counter-proposal considered and rejected: pure `root_cause_layer + subtype` — it splits the
  real cluster, see §0. The token approach is presented for Ethan to confirm the exact K / vocab.)*
- **Dedupe rule:** frequency counts **distinct bug `id`s** per signature (a single bug, even if it
  mentions a token twice, counts once); signatures are canonicalized (sorted token set) so order
  doesn't create phantom groups.
- **Threshold:** `frequency_threshold`, **default 2**, injectable via a `{ threshold }` option
  (see the pack seam below). A cluster with `distinct_bug_count >= threshold` becomes a candidate.
- **Output:** a deterministic, ranked **candidate-pattern report** (ranked by distinct-bug count,
  then by token salience), each candidate carrying `{ signature_tokens, bug_ids[], shared_facets,
  count }`. Emitted as a structured object; the sub-skill renders markdown + (default) stdout.
- **Malformed-ledger handling (the PR #3 lesson):** a file that fails to parse (no frontmatter, or
  missing `id`) **fails loudly** — the miner throws / records a hard error and is never silently
  skipped. A "skip-on-error" mode does **not** exist by default.

### 2.2 Pack seam (why core stays pack-agnostic)
Core is public and standalone; it **cannot import the private pack**. So: the **miner takes the
threshold as an injected option (default 2)**; the *sub-skill/agent* is responsible for reading the
pack config profile (`shipwithai-fixkit-pack/CLAUDE.md`) **when a pack is present** and passing the
value in. I will **add a `pattern_mining` tunable block to the pack `CLAUDE.md`** (focus repo) —
`frequency_threshold: 2` — documented as the override the agent reads. No core→pack dependency.

### 2.3 `skills/pattern-mining/` (`user-invocable:false` sub-skill)
Wires the loop: **mine → rank → propose**. Each proposal is a markdown playbook entry that **cites
its source bug IDs** (evidence, not assertion). **Destination (proposed):** default **stdout** (the
ranked report + rendered proposals); optional `--out <dir>` writes `PATTERN-<slug>.md` files into a
**target repo's `docs/playbook/`** — **never** into any `.fixkit/` dir and **never** into the engine
repo's own tree during a gate-run. For the in-phase gate-run against `shipwithai.io` we capture
**stdout only** (no writes into the consumer repo). Ships with `evals/evals.json` (≥5; ≥3 trigger /
≥2 must-not) and ends with `## What this skill does NOT do`.

### 2.4 `agents/pattern-learning.md` (flat `.md`)
Frontmatter `name` / `description`(+ triggers) / `model` / `tools` (read-only set: `Read, Glob,
Grep, Bash` for invoking the miner — **no `Write`/`Edit` into `.fixkit/`**). Body: read a `.fixkit/`
dir, run the miner, render ranked proposals citing bug IDs; **NEVER writes to a ledger**
(append-only is the ledgers' property; the agent's output is a separate proposal artifact). Ends
with `## What this agent does NOT do` (explicitly: does not mutate ledgers, does not auto-apply
playbook entries, does not lower the threshold to force a hit).

### 2.5 Gate additions (`tests/run-all.js`, additive only) — tests-first
New section "Pattern miner" on **synthetic ledger fixtures** under `evals/fixtures/pattern/`:
1. **recurring pair surfaces at threshold** — two synthetic ledgers sharing a design-organism
   signature ⇒ one candidate with both bug_ids.
2. **sub-threshold noise does NOT** — a lone unique-signature ledger ⇒ no candidate at threshold 2.
3. **negative control** — a consumer-local ledger (003-shaped) does **not** join the organism
   cluster (token gate excludes it).
4. **malformed ledger fails loudly** — a fixture with no frontmatter ⇒ the miner throws / errors,
   never a silent skip (asserts the error path; the PR #3 lesson).
5. **≥1 mutation check** — flip the threshold (2→3) or drop a token from the matcher and assert the
   recurring pair **stops** surfacing (the test bites; a no-op miner cannot pass).

---

## 3. Engine deliverable B — public-readiness audit (no code behavior change)

Output = an audit checklist in the PR body, **each item with its verifying command**. Items:

| # | Item | Verifying command | Current status |
|---|---|---|---|
| 1 | **LICENSE (MIT) present + year** | `test -f LICENSE && grep -q 'MIT' LICENSE && grep -q 2026 LICENSE` | **FAILS today → remediation: add root MIT `LICENSE` (2026 ShipWithAI)** |
| 2 | NOTICE + vendored-spine attribution intact | `grep -q 'Jesse Vincent' NOTICE && grep -q '2025' NOTICE && grep -q 'systematic-debugging' NOTICE` | passes |
| 3 | README accurate for **six** plugins | `ls -1 plugins \| wc -l` (=6) + README cross-check | verify in-phase |
| 4 | No secrets/tokens/local-abs paths in tracked files | `git grep -nE '(/Users/\|ghp_\|sk-\|BEGIN [A-Z ]*PRIVATE KEY)' -- . ':!*.md'` (+ a curated `.md` sweep) | sweep in-phase |
| 5 | CHANGELOG current (core 0.3.0 entry) | `grep -q '0.3.0' plugins/shipwithai-fixkit-core/CHANGELOG.md` | after bump |

Remediation commits are **docs/licensing only** (LICENSE add, README/CHANGELOG touch-ups); no
runtime code changes. If the secret-sweep finds a real local-absolute path in a tracked file, fix it.

### Versioning (cross-phase bar)
Core **0.2.0 → 0.3.0** (minor — new agent/miner capability, not a patch). **4-key sync**:
`plugins/shipwithai-fixkit-core/.claude-plugin/plugin.json` == per-plugin `marketplace.json`
(top-level **and** `plugins[0]`) == root `.claude-plugin/marketplace.json` entry. CHANGELOG entry
added. No other plugin's version moves (the capability is core-only).

---

## 4. Focus repo deliverables

1. **CI fix** — port the engine's PR #3 `validate-plugin.yml` (add `fetch-depth: 0`; diff against
   `github.event.pull_request.base.sha`; **fail loudly** if the base commit is missing; tolerate only
   a genuinely empty plugin-path filter; self-trigger on workflow edits; `workflow_dispatch` =
   validate-all). Verify the focus file first, fix what's actually there (confirmed: same bug).
2. **Re-pin** — after the **engine PR merges first**, take the new engine `main` SHA and update the
   focus root `marketplace.json`: both pinned entries' `sha`, core's pinned `version` 0.2.0 → 0.3.0,
   and `_pin_note` (new SHA + rationale). Web stays 0.1.0. **Explicit sequence:** engine PR merges →
   capture SHA → focus re-pin commit → focus PR. (drift-monitor flags staleness if skipped.)
3. **Remote prep** — rename local `master` → `main`; default `main` (Q3 convention); secret-sweep
   the focus tree (same `git grep`); add a README/CLAUDE.md note that the engine pin is **public
   upstream**. CC prepares; **Ethan/CC create the private remote + push at PR-out**.
4. **Add the `pattern_mining` tunable** to `plugins/shipwithai-fixkit-pack/CLAUDE.md`
   (`frequency_threshold: 2`) — the override the agent reads (§2.2).

### Cross-repo install proof (the "install works" half of the P5 gate)
Design (P1 pattern — evidence where exercisable, else documented procedure + a deterministic
resolution check + critic):
- (a) **Engine marketplace standalone** — `claude plugin marketplace add` resolves the six plugins.
- (b) **Focus marketplace** — pulls the pack + **pinned** engine plugins via
  `source:{source:git-subdir, url, path, ref, sha}`.
- Where the CLI can't run from CC's context, ship a **step-by-step procedure** + a **deterministic
  resolution check**: a zero-dep script that, given the focus `marketplace.json` pin, fetches
  `url`@`sha` and **asserts the `path` subdirs exist** (and the pinned `plugin.json` versions match).
  **Cowork/Ethan execute the live install as the final check** (acceptance #6).

---

## 5. Cross-phase bar (every box, explicitly)
ADR-0002 PLAN approved before code (this doc) · CI green on both PRs (run URLs in PR bodies) ·
new sub-skill: <200 / inline ≤20 / ≥5 evals (3-trigger / 2-must-not) / ends `## What this … does
NOT do` · new agent ends `## What this agent does NOT do` · miner negative tests + ≥1 mutation
check · quality ≥8.0 to ship · CHANGELOG + version bumped (core minor) · **evidence, not assertions**
(every proposal cites bug IDs; every audit item cites a command).

---

## 6. Critic pass (worker ≠ grader)
A fresh `architect`/`critic` refutation pass on **each** repo's diff before "done" — verifying
against the §7 acceptance criteria, not a vague "is it done?". Worker context never self-approves.

---

## 7. Acceptance suite = the Phase-5 gate (doc 10 §P5)

**Mechanized (CC):**
1. All **seven** gates green (six engine plugins + focus pack); CI validate matrix **actually
   executes** on both PRs (run URLs in PR bodies — not just "configured").
2. Miner controls: recurring pair surfaces at threshold; sub-threshold does not; **negative control
   (003-shaped) stays out**; malformed ledger → loud failure; mutation check bites.
3. Audit checklists complete (engine public-readiness; focus secret-sweep) — each item with command.
4. Critic refutation pass on each PR.

**In-phase gate-run (real data, NOT deferred):**
5. Run `pattern-learning` against `shipwithai.io/.fixkit/` (read-only). **Expectation:** it surfaces
   the **design-organism cluster {BUG-001, BUG-004, BUG-005}** at threshold 2, cites those IDs, and
   **excludes BUG-003** (the consumer-local negative control). **Honesty clause:** if the corpus
   genuinely yields nothing at threshold 2, **report that and HALT** — do **not** lower the bar to
   force a pass.
6. **Live install proof** executed by Ethan/Cowork after the repos are public/pushed.

**Ethan's manual steps (CC prepares, Ethan executes):** create the private focus remote + push;
flip engine visibility to public (after audit + approval).

---

## 8. Risks & mitigations
| Risk | Mitigation |
|---|---|
| **Small corpus (4 ledgers).** Threshold too high ⇒ nothing surfaces. | Default **2**, tunable via pack config; the real cluster is 3 bugs, so threshold 2 has margin. Honesty clause if it still yields nothing. |
| **Matching-key over/under-fit.** Token matcher could over-merge (catch 003) or under-merge (split 001/004/005). | The "≥1 scope token" gate is exactly the discriminator (003 has no design-package token); the negative-control test (§2.5 #3) bites if it regresses. K / vocab confirmed with Ethan before coding. |
| **Promoting `frontmatter.js`** touches a gate-adjacent file. | Re-export shim keeps the gate's `require` + parser unit tests untouched; move is behavior-preserving (green gate proves it); trivial rollback. |
| **Re-pin sequencing** (engine must merge before focus re-pin). | Sequence stated explicitly (§4.2); focus PR opens only after the engine SHA exists. |
| **Public flip exposes secrets.** | `git grep` secret-sweep is audit item #4, run before Ethan flips; flip is gated on audit pass. |
| **Agent writes a ledger / auto-applies.** | Agent tools exclude `Write`/`Edit` into `.fixkit/`; "does NOT do" enumerates it; proposals go to stdout / target `docs/playbook/` only. |

---

## 9. Out of scope (unchanged)
P2–P4 real-bug gate-runs (separately tracked) · P1 close-out (Upstash env, shipwithai.io deploy,
prod re-check) · design-repo push (later) · **writing to any `.fixkit/` ledger** (read-only mining) ·
**auto-applying** playbook proposals (human reviews; the agent only proposes) · new adapters or pack
features · **weakening any guard**.

---

## 10. Execution order (post-approval, autonomous to two PRs)
1. Engine: promote parser + shim → `lib/pattern-miner.js` → synthetic fixtures + gate section
   (tests-first) → `skills/pattern-mining/` (+ evals) → `agents/pattern-learning.md` → core 0.3.0
   bump + 4-key sync + CHANGELOG → add root `LICENSE` + audit checklist → `node tests/run-all.js`
   green → in-phase gate-run on `shipwithai.io/.fixkit/` (capture stdout) → critic → **engine PR**.
2. (Engine PR merges → capture new `main` SHA.)
3. Focus: CI fix → pack `pattern_mining` tunable → re-pin to new SHA (core 0.3.0) + `_pin_note` →
   secret-sweep → `master`→`main` + README note → resolution-check script → focus gate green →
   critic → **focus PR**.
4. Hand back to Ethan: live install proof + engine visibility flip + focus remote push.

> **HALT — ADR-0002.** Awaiting Ethan's approval (and confirmation of the §2.1 matcher K / vocab)
> before any implementation.

---

## What this PLAN does NOT do
- It does not implement anything yet (ADR-0002 — HALT for approval first).
- It does not flip engine visibility or push the focus remote (Ethan's manual steps).
- It does not write to any `.fixkit/` ledger, lower the mining threshold to force a pass, or
  auto-apply a playbook proposal.
- It does not weaken or edit any state-machine guard; the new capability is additive + read-only.
