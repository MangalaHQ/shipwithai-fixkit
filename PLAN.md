# PLAN.md — Phase 1: web adapter + ShipWithAI pack ⭐

> **Status:** ✅ **APPROVED at plan-in (Ethan, 2026-06-04).** Executing §10 autonomously to PR.
> **Plan-in rulings:** (Q1) bug pre-state = **as-if-undiscovered / oracle** — existing gap-log + commits are held-out ground truth; engine reproduces conclusions independently, no destructive resets. (Q2) target = **`/Users/ethannguyen/Data/WorkspaceSWA/shipwithai.io`**, branch `phase-1/<topic>` **off current HEAD** (keep its uncommitted in-scope changes). Defaults accepted: reuse `drafts/V0.{N}-STREAM-{X}-GAPS.md` gap-log; interim local-SHA `file://` engine pin; Bug 3 = consumer fix; delete dead `ReactionBar.tsx`.
> **Gate:** ADR-0002 plan-before-execute — satisfied. Next HALTs: live-UI verification handshakes (Cowork) + PR-out (Ethan).
> **Supersedes:** the Phase-0 `PLAN.md` (preserved in git history @ `67d218d` and ancestors).
> **Source of truth (all confirmed reachable — no HALT):** `../shipwithai-fixkit-design/{08,09,10,12,13}` + `../shipwithai-fixkit-design/handoffs/CC-PHASE-1.md` + `../shipwithai-plugins/` conventions.
> **Engine baseline:** `shipwithai-fixkit` @ `67d218d` (Phase 0 + 0b closed), `shipwithai-fixkit-core` v0.1.0.

---

## 0. Executive summary & the one decision that reshapes execution

This is the **proof phase**: the engine must fix two real consumer bugs on `shipwithai.io` (Bug 3, Bug 4) through the full FULL loop and **correctly refuse** to fix a design-organism bug in the consumer (Bug 1 → gap-log → `escalated`). We ship a **thin web adapter** in the engine repo and a **ShipWithAI pack** in a new private focus repo, then run the 3-bug acceptance suite as the Phase-1 gate.

**Load-bearing pre-flight finding (changes how we run the gate):** the three bugs are **not greenfield** — the ShipWithAI team has already manually diagnosed all three, and the artifacts exist on disk:

| Bug | Current real-world state (discovered during exploration) |
|---|---|
| **Bug 1** — ArticleHero `--no-image` 96px gap | **Already gap-logged** at `shipwithai.io/drafts/V0.28-STREAM-C-GAPS.md:28-50`, status OPEN, with confirmed additive cause (`--no-image` `padding-bottom:64px` + `.__lead margin-bottom:32px` = 96px) and a recommended design-repo fix. Root cause lives in `@shipwithai/design` ArticleHero organism. |
| **Bug 3** — code-block horizontal overflow | Body fences inside `ArticleBody` already have `overflow-x:auto` (design repo). The live overflow surface is the **consumer** `src/components/blog/CodePreviewSnippet.astro` (currently modified in the working tree). Related code-pipeline analysis already logged at `V0.28-STREAM-C-GAPS.md:52-91`. |
| **Bug 4** — ReactionsBar dead + storage errors | Live `ReactionsBar` is the **Astro organism** rendering `disabled` buttons; its behavior (`initReactionsBar` in `ReactionsBar.behavior.ts`) is **never wired** by the consumer. A separate **dead React `ReactionBar.tsx`** (uses `localStorage`) is the storage-error source. Fix is consumer-side wiring in `BlogPostPage.astro`. |

**Implication for the PLAN (needs Ethan's ruling — see §11 Q1):** we must decide whether Phase 1 (a) runs the engine on the bugs **as if undiscovered**, treating the existing gap-log/commits as held-out ground truth to validate engine correctness against (recommended — it's an honest test of the engine), or (b) resets the consumer/design working trees to a pre-fix state first. Either way the existing artifacts are gold-standard oracles: the engine's independent conclusions must *match* them.

**Gap-log destination proposal (Decision 4, "CC proposes in PLAN"):** **reuse the existing convention** — `shipwithai.io/drafts/V0.{N}-STREAM-{X}-GAPS.md`, "Bug-fix round — design-organism root causes" section, the established 4–6 column schema. Do **not** invent a new file. Rationale and exact format in §6.

---

## 1. Decisions locked by Ethan (carried from handoff §1) + CC's plan-in fills

| # | Decision | Value |
|---|---|---|
| 1 | Target repo (3 real bugs) | **`/Users/ethannguyen/Data/WorkspaceSWA/shipwithai.io`** — CC located and confirmed it (Astro 5.6, content collections, `file:../shipwithai-design`, `npm run dev`→4321, git branch `feature/new-design`). *Ethan to confirm this is the intended folder (handoff left the path blank).* |
| 2 | Canonical dev env | `npm run dev` → `localhost:4321` (Astro default) — **confirmed** (no port override in `astro.config.mjs`). |
| 3 | Live-UI verification | reproduce on prod (`shipwithai.io`) → verify on local dev (`:4321`) → prod re-check after deploy. |
| 4 | Gap-log destination | **CC proposes:** reuse `shipwithai.io/drafts/V0.{N}-STREAM-{X}-GAPS.md` (see §6). |

**Roles (operating model, doc 12):** CC writes all repo code + runs mechanical verify (build/test/lint/gate) + runs its own critic. **CC cannot verify live UI (no Chrome).** At "fix applied + local dev running" CC posts a **verification request** and HALTs that bug; **Cowork measures the live DOM via Chrome and writes evidence into the ledger**; only then does the ledger advance. **Ethan** approves at two boundaries: plan-in (now) and PR-out.

---

## 2. Engine repo deliverables — `shipwithai-fixkit`

### 2.1 New plugin `plugins/shipwithai-fixkit-web/` (thin adapter, doc 09 §9 — no debugging logic)

An adapter is **mappings + recipes + declarations only**: `CONNECTORS.md`, capability declaration, environment/hygiene, reproduce/verify recipes, source-map hints. No orchestration, no layer-agents (those live in core), no debugging logic.

```
plugins/shipwithai-fixkit-web/
├── .claude-plugin/
│   ├── plugin.json              # name "shipwithai-fixkit-web", version 0.1.0, explicit skills[]
│   └── marketplace.json         # top-level version == plugins[0].version (4-key sync)
├── manifest.json                # SKILL registry (skillId/name/description/enabled)
├── CLAUDE.md                    # adapter identity + "What this plugin does NOT do"
├── README.md
├── CHANGELOG.md
├── CONNECTORS.md                # ~~browser→Claude in Chrome · ~~runtime→dev server :4321 ·
│                                #   ~~test-runner · ~~ci · ~~source control (+ alternatives each)
├── skills/
│   ├── web-environment/         SKILL.md + evals/evals.json   (user-invocable: true)
│   │     # stand up/locate target; canonical port 4321; hard-refresh; cache discipline
│   │     # (.astro/, node_modules/.vite); kill stale servers; file: symlink dep caveat
│   ├── web-reproduce/           SKILL.md + evals/evals.json   (user-invocable: false)
│   │     # recipes per layer/subtype: computed-style read, scrollWidth vs clientWidth,
│   │     # console read, interaction+state assertion, viewport/resize matrix
│   ├── web-verify/              SKILL.md + evals/evals.json   (user-invocable: false)
│   │     # proof recipes mirroring reproduce; emits handoff/v0 when ~~browser absent
│   └── web-source-map/          SKILL.md + evals/evals.json   (user-invocable: false)
│         # symptom → file on Astro/content-collections stack (generic web level)
├── lib/
│   └── capability.json          # declared tiers: UI=FULL, Logic=FULL, System=FULL
├── tests/
│   └── run-all.js               # plugin's OWN blocking gate (limits + evals + version sync)
└── evals/
    └── fixtures/
        └── web-stub/            # ~~browser proof fixture pair (UI analogue of the core
              # reproduce.test.js / verify.test.js stub): a computed-geometry assertion that
              # FAILS on a "buggy" fixture and PASSES on a "fixed" fixture, headless/DOM-shim
```

**Conventions enforced (gate-blocking):** every `SKILL.md` < 200 lines, ends with `## What this … does NOT do`; max fenced code block ≤ 20 lines; `description` < 200 chars; **≥ 1 `user-invocable:false` sub-skill** (we have 3); **≥ 5 evals/skill** (≥3 `shouldTrigger:true`, ≥2 `false`); agents (n/a here — none) would end with `## What this agent does NOT do`. Required files for `validate-plugin.yml`: `plugin.json`, `manifest.json`, `CLAUDE.md`, `README.md`, `CHANGELOG.md`, ≥1 SKILL.md, ≥1 evals.json. The plugin ships its **own** `tests/run-all.js` so it gets a *blocking* gate (the shared CI quality-limit step is warning-only).

**CONNECTORS.md** binds the six `~~category` placeholders the core references; web sets `~~browser`→Claude in Chrome (the live-UI proof tool), `~~runtime`→`astro dev` on :4321, `~~test-runner`→`node`/`vitest`, `~~ci`→GitHub Actions, `~~source control`→git/GitHub; lists alternatives; uses the `## If <connector> Available` graceful-upgrade idiom. UI FULL requires `~~browser` present → when absent, the layer downgrades to ASSIST and `web-verify` emits `handoff/v0` (stops at `candidate`). This is exactly the CC-cannot-see-Chrome path: CC produces the handoff, Cowork is the verification provider.

### 2.2 `handoff/v0` format in core `lib/` (versioned, doc 09 §13.3)

Defined **now** so P3/P4 inherit it. Minimal schema — **steps + assertion + target env/device + `verified_by` slot** — authored as a documented JSON/YAML shape plus a zero-dep validator stub, slotting into the existing `verification` object (`{method, capability_tier, evidence, verified_by}`) and `LAYER_METHODS`. Files:

```
plugins/shipwithai-fixkit-core/lib/
├── handoff.schema.md            # the v0 contract (fields, semantics, example) — NEW
└── handoff-validator.js         # zero-dep: validateHandoff(h) → {ok, violations[]} — NEW
plugins/shipwithai-fixkit-core/tests/run-all.js   # +section: handoff/v0 acceptance + negative
```

Proposed `handoff/v0` fields:
```
version: "handoff/v0"
bug_id, symptom_layer (UI|Logic|System), target { env, url, device, viewport }
steps: [ ordered reproduction/verification actions ]
assertion: { method (∈ LAYER_METHODS), expected }   # e.g. scrollWidth ≤ clientWidth on `pre`
verified_by: null   # provider fills (Cowork/CI/device-farm) → then ledger may close
```
Because web is FULL/FULL/FULL, Phase 1 ships no *standing* ASSIST path — but the verification-request handshake (CC posts request, Cowork fills `verified_by` + evidence) **is** the `handoff/v0` round-trip in practice, so we exercise the format for real on every UI bug.

### 2.3 Version sync, gate, CHANGELOG

- New plugin starts at **0.1.0**; 4-key sync (its own `plugin.json` ⇄ its `marketplace.json` top-level ⇄ `plugins[0]`), plus a **second entry** in the **root** `.claude-plugin/marketplace.json` `plugins[]` array with `source: "./plugins/shipwithai-fixkit-web"`.
- Core bumps to **0.2.0** (adds `handoff/v0` — minor, additive). All four core keys move together; CHANGELOG updated; `tests/run-all.js` stays green (`cd plugins/shipwithai-fixkit-core && node tests/run-all.js` exit 0) and the new web plugin's `tests/run-all.js` exits 0.
- `publish-plugin.yml`/`validate-plugin.yml` are generic over `plugins/*` — **no workflow change needed**.

---

## 3. Focus repo deliverables — new `shipwithai-fixkit-focus`

Currently contains only `README.md`. Scaffold to `shipwithai-plugins` conventions **+ the full Phase-0b Tier-3 harness**, then add the pack.

### 3.1 Full file tree

```
shipwithai-fixkit-focus/                         # PRIVATE repo; depends on engine by pinned SHA
├── CLAUDE.md                                    # starter-format; Harness config footer (Tier 3, Obs ON)
├── README.md                                    # (exists — extend)
├── CHANGELOG.md
├── NOTICE                                        # (if any vendored content; likely minimal)
├── .gitignore                                    # mirror engine: .omc/, node_modules/, .claude/logs/, settings.local.json
├── .mcp.json                                     # github MCP server (+ any pack-specific)
├── .claude-plugin/
│   └── marketplace.json                          # lists shipwithai-fixkit-pack (local) + pinned ENGINE (§5)
├── .claude/                                      # Tier-3 harness (replicate from engine, repoint to pack)
│   ├── settings.json                             # permissions + register the 3 hooks
│   ├── hooks/validate-command.py                 # PreToolUse:Bash safety (stdlib, copy as-is)
│   ├── hooks/protect-files.py                    # PostToolUse — WARN list repointed to pack paths (§3.3)
│   ├── hooks/observe.py                           # PostToolUse observability logger (copy as-is)
│   ├── agents/drift-monitor.md                   # repoint SSOT paths to pack + pinned engine
│   ├── memory/MEMORY.md + project.md             # focus-specific decisions
│   └── starter-context.json                      # version "1.2", tier "full", observability true
├── docs/
│   ├── architecture.md                           # focus/pack architecture
│   ├── CODEMAPS/fixkit-pack.md                    # navigation map for the pack
│   └── adr/
│       ├── 0001-blueprints-as-source-of-truth.md # carried over
│       ├── 0002-plan-before-execute.md           # carried over
│       ├── 0003-read-before-edit.md              # carried over
│       └── 0004-pack-overlay-and-hard-locks.md   # NEW: focus-specific extension ADR
├── .github/workflows/
│   ├── validate-plugin.yml                        # PR CI (copy)
│   └── publish-plugin.yml                          # publish-on-bump (copy)
└── plugins/shipwithai-fixkit-pack/
    ├── .claude-plugin/{plugin.json, marketplace.json}   # 4-key sync, v0.1.0
    ├── manifest.json
    ├── CLAUDE.md                                   # CONFIG PROFILE: thresholds, dev port 4321,
    │                                               #   hard-locks tunables (SSOT — not in skills)
    ├── README.md  CHANGELOG.md  CONNECTORS.md      # ShipWithAI's concrete servers
    ├── skills/
    │   ├── shipwithai-hard-locks/    SKILL.md + evals/   (user-invocable: false)
    │   ├── design-consumer-routing/  SKILL.md + evals/   (user-invocable: false)
    │   └── astro-recipes/            SKILL.md + evals/   (user-invocable: true)
    ├── packs/shipwithai/
    │   ├── hard-locks.md                            # AD-027 data-surface, URL immutability,
    │   │                                            #   emerald Subscribe, JBM-only — pre-fix enforced
    │   ├── design-consumer-routing.md               # organism→gap-log→escalated; never fork organism
    │   ├── astro-recipes.md                          # client:* hydration, content collections
    │   ├── env-hygiene.md                            # canonical port, cache discipline
    │   ├── verify-snippet.js                          # computed-style/scrollWidth verify helper
    │   └── component-map.seed.md                      # seeded from @shipwithai/design inventory
    └── tests/run-all.js                              # pack's OWN blocking gate
```

### 3.2 Pack content (overlays the web adapter; adds, never removes — doc 09 §10)

- **hard-locks.md** — encodes AD-027 `data-surface`, URL immutability, emerald Subscribe, JBM-only. **Enforced pre-fix** via the core seam: the pre-fix step populates the ledger's `hard_lock_violations` array; a new core validator rule refuses `enter_fixed`/`enter_candidate` when it is non-empty (see §7 negative test 1, §8). Tunable values live in the pack `CLAUDE.md`, **never hardcoded in skill bodies**.
- **design-consumer-routing.md** — the Bug-1 rule: when `root_cause_layer == upstream` (`@shipwithai/design`), **zero consumer edits**, emit a gap-log row (§6), ledger → `escalated`. Never fork/patch the organism in the consumer.
- **astro-recipes.md** — `client:*` hydration recipe (Bug 4), content-collections notes; overlay on the web adapter's generic recipes.
- **env-hygiene.md + verify-snippet.js** — port 4321, hard-refresh, clear `.astro/`+`node_modules/.vite` after editing the `file:`-linked design package; the verify snippet returns computed geometry/console state for the verification-request handshake.
- **component-map.seed.md** — seeded from `@shipwithai/design`'s `docs/COMPONENT-INVENTORY.md` (11 organisms incl. ArticleHero, ReactionsBar, ArticleBody).

### 3.3 Harness adaptations (only two files carry engine-specifics)

- `protect-files.py` WARN list → repoint from `lib/ledger-validator.js`/`tests/run-all.js` to `packs/shipwithai/hard-locks.md`, `CONNECTORS.md`, `CLAUDE.md` config profile, and the marketplace pinned-source block. Keep the hard-block secret patterns as-is.
- `drift-monitor.md` → repoint SSOT comparison to the pack + the pinned engine SHA (flag drift if the local engine HEAD ≠ pinned `sha`).

---

## 4. Engine-pinning strategy (no remote exists yet)

**Canonical target form (doc 08 §1)** — focus `marketplace.json` lists engine plugins via a `source` *object*:
```json
"source": { "source": "git-subdir", "url": "https://github.com/shipwithai/shipwithai-fixkit.git",
            "path": "plugins/shipwithai-fixkit-core", "ref": "main", "sha": "<pinned>" }
```
No GitHub remote exists today, so `url`+`sha` can't resolve. **Interim proposal (two-stage):**

- **Stage A — local-SHA pin (now, no remote).** Use a local `git-subdir`-equivalent source pointing at the sibling working copy, pinned to a real commit SHA so the pin is *meaningful and auditable*:
  ```json
  "source": { "source": "git-subdir",
              "url": "file:///Users/ethannguyen/Data/WorkspaceSWA/shipwithai-fixkit",
              "path": "plugins/shipwithai-fixkit-core", "ref": "main", "sha": "<engine HEAD after 2.x lands>" }
  ```
  (Plus the same object for `shipwithai-fixkit-web`.) The `sha` is recorded the moment the engine's Phase-1 work is committed; `drift-monitor.md` flags if the local engine HEAD diverges from the pinned `sha`. If the local resolver can't honor `git-subdir+file://`, fall back to a documented relative path source (`../shipwithai-fixkit/plugins/shipwithai-fixkit-core`) **with the target SHA recorded in a comment + CHANGELOG**, so the migration is mechanical.
- **Stage B — remote migration (once pushed).** When the engine repo is pushed to its GitHub remote: swap `url` → the `https://github.com/...` form, keep `path`/`ref`, re-pin `sha` to the pushed commit. One-line change per engine plugin entry; recorded as a focus CHANGELOG entry + ADR note. Negative test 3 (engine standalone still installs) is unaffected because the engine repo's own marketplace uses self-relative `source: "./..."`.

**Risk control:** the pin's whole value is the immutable `sha`; we never ship a floating `ref`-only pin. Verification provider (Cowork) and CI can both assert `installed engine commit == pinned sha`.

---

## 5. Focus `marketplace.json` (pack + pinned engine together)

Named `"shipwithai-fixkit-focus"`. `plugins[]` =
1. **local pack** — `{ "name": "shipwithai-fixkit-pack", "version": "0.1.0", "source": "./plugins/shipwithai-fixkit-pack", ... }`
2. **pinned engine core** — `source:{git-subdir,...core...,sha}` (§4)
3. **pinned engine web** — `source:{git-subdir,...web...,sha}` (§4)

So installing from focus yields **pinned engine (core+web) + the ShipWithAI pack together** (negative test 3a); the engine repo still installs standalone via its own self-relative marketplace (negative test 3b).

---

## 6. Gap-log: format + destination (Decision 4)

**Destination — reuse the existing, active convention** (do not invent): `shipwithai.io/drafts/V0.{N}-STREAM-{X}-GAPS.md`, under a **"Bug-fix round — design-organism root causes"** section. This file already exists (`V0.28-STREAM-C-GAPS.md`) and **already contains the Bug-1 entry** (lines 28-50) in exactly the right shape — it is the team's operating gap-log, governed by `@shipwithai/design` CLAUDE.md "closure-shape #4" (default zero design-repo edits; consumer never patches the organism).

**Row schema (matches existing entries):** a titled subsection per design-organism root cause with: **Symptom · Render system · Confirmed cause (file:line) · Why-not-consumer · Recommended design-session fix · Hard-lock check · Status (OPEN→design session)**. For the migration-gap table form, the columns are `Component | Gap | Local behavior | Design behavior | Workaround | Design-repo action`.

**Pack behavior:** `design-consumer-routing` skill, on `root_cause_layer == upstream`, appends a row here, sets ledger `state: escalated`, and makes **zero edits** to `shipwithai.io/src/**`. The engine's independently-produced Bug-1 entry must match the existing oracle entry's cause and recommended fix.

**Alt destination (if Ethan prefers a design-side canonical sink):** `@shipwithai/design/docs/ROADMAP.md` backlog. Recommendation: stay with the consumer-side per-stream `*-GAPS.md` — it is where the workflow already lives.

---

## 7. Bug 3 / 4 / 1 execution choreography (the gate)

CC runs each bug through `/shipwithai-fixkit-core:fix` (orchestrator on the main thread → isolated UI layer-agent → spine REPRODUCE→ISOLATE→DIAGNOSE→FIX→VERIFY→GUARD). At "fix applied + local dev running", CC HALTs that bug with a **verification request** (the `handoff/v0`: URL, exact elements, expected computed values/console state); **Cowork measures live DOM via Chrome and writes `evidence` + `verified_by` into the ledger**; only then does `applyTransition` advance to `verified`→`closed`.

| Bug | Layer/tier | CC does (repo) | Verification request → Cowork measures | Ledger terminal |
|---|---|---|---|---|
| **Bug 3** code overflow | UI · FULL | Reproduce `scrollWidth > clientWidth` recipe; diagnose the `pre`/overflow rule; **consumer fix** (likely `CodePreviewSnippet.astro` and/or other consumer `pre` renderers — ArticleBody body fences already covered) | request: `scrollWidth ≤ clientWidth` on the `pre` at target widths + console clean | `closed` w/ computed-geometry evidence + `verified_by` |
| **Bug 4** ReactionsBar | UI · FULL | Reproduce dead click + 4× storage errors; diagnose missing hydration/behavior wiring; **consumer fix** in `BlogPostPage.astro` (wire `initReactionsBar`); remove dead `reactions/ReactionBar.tsx` | request: clicking Useful/Learned/Saved changes state on live site; 4× storage exceptions gone | `closed` w/ interaction + console evidence |
| **Bug 1** ArticleHero | UI symptom · **root cause = design organism** | Reproduce 96px gap; diagnose `root_cause_layer == upstream` (`ArticleHero.astro` additive `--no-image` padding + lead margin); **pack rule fires → gap-log row (§6), ZERO consumer edits** | request: confirm `git diff` of consumer = empty; gap-log row present | **`escalated`** (never "fixed"); evidence = gap-log entry |

Live-UI verification path (Decision 3): reproduce on prod `shipwithai.io` → verify on local dev `:4321` → prod re-check after deploy. **Bug 1 must end `escalated`, and the consumer `git diff` must be empty** — this is the most important test (the engine correctly *refuses*).

---

## 8. Negative tests (the Phase-1 gate's refusal proofs)

1. **Hard-lock blocks pre-fix.** A fix attempt that would strip `data-surface` is blocked *before* the edit: the pre-fix step writes `hard_lock_violations: ["data-surface-removed"]`; a **new core validator rule** refuses `enter_fixed`/`enter_candidate` when `hard_lock_violations` is non-empty. **Tests-first** (ADR + CLAUDE.md): write the failing transition fixture first, then the guard, mutation-check it bites. Wired through the adapter/pack path *and* unit-tested in core `run-all.js`.
2. **UI bug cannot `close` on a source diff.** Already a core guard (`VERIFICATION_LAYER_MISMATCH` via `LAYER_METHODS.UI`). Prove it **fires through the adapter path too**: a UI ledger whose only evidence is a code diff (method not in `LAYER_METHODS.UI`) is refused.
3. **Install integrity.** (a) Focus marketplace installs **pinned engine (core+web) + pack together**; (b) engine repo still installs **standalone**. Verified by resolving both marketplaces (documented procedure + a check that installed engine commit == pinned `sha`).

Executable where possible (1, 2 as `run-all.js` sections / fixtures); 3 as a documented procedure + critic check.

---

## 9. Acceptance / cross-phase bar (doc 10 §done)

- All three acceptance rows pass (Bug 3 `closed`, Bug 4 `closed`, Bug 1 `escalated` w/ gap-log + empty consumer diff).
- All three negative tests pass.
- **CI green on both repos:** SKILL.md <200 / references <150 / bundles <500 / inline code ≤20 / description <200 chars; **4-key version sync**; **≥5 evals/skill** (3/2 split); every skill/agent ends with `## What this … does NOT do`; compose by convention (explicit `skills[]`, no `plugin.json` dep wiring).
- **Quality matrix ≥ 8.0 on the pack** (ship threshold — P1 is public-facing proof).
- CHANGELOG + versions bumped (core 0.1.0→0.2.0; web 0.1.0; pack 0.1.0).
- **Critic refutation before done** (fresh reviewer, worker ≠ grader); **evidence not assertions**; the mandatory deslop pass + post-deslop regression run.
- **Security review before touching `.claude/hooks/`, `assets/`, `manifest.json`** (ADR / CLAUDE.md).

---

## 10. Work breakdown & sequencing (post-approval, autonomous to PR)

1. **Engine — `handoff/v0` (tests-first)** → core `lib/handoff.schema.md` + `handoff-validator.js` + `run-all.js` section; core → 0.2.0.
2. **Engine — hard-lock seam guard (tests-first)** → new `applyTransition` branch + validator rule on `hard_lock_violations`; failing fixture first, mutation-check. *(Security review: touches the trust anchor — guard-change protocol.)*
3. **Engine — web adapter plugin** → CONNECTORS/skills/capability/recipes/source-map/web-stub fixture + its own `run-all.js`; 4-key sync incl. root marketplace second entry.
4. **Focus — scaffold + Tier-3 harness** → repo skeleton, `.claude/` harness (adapt 2 files), docs/ADRs, workflows, `.mcp.json`. *(Security review: hooks.)*
5. **Focus — pack** → hard-locks / routing / astro-recipes / env-hygiene / verify-snippet / component-map seed + config-profile CLAUDE.md + CONNECTORS + own gate; pinned-engine marketplace (§4–5).
6. **Run the gate (3 bugs + 3 negatives)** → for each UI bug: CC fixes + builds + posts verification request + **HALT for Cowork live-DOM evidence** → ledger advances. Bug 1 → gap-log + escalated.
7. **Quality matrix ≥8.0 on pack; critic refutation; deslop + regression; CHANGELOG/versions; PR-out HALT for Ethan.**

Steps 1–5 are largely independent (engine vs focus) and parallelizable; step 6 depends on 1–5 + Cowork availability; the **gate is gated on Cowork's live-UI measurements** (CC cannot self-verify UI).

---

## 11. Open questions for plan review (Ethan / Cowork)

1. **Bug pre-state (load-bearing, §0).** Bugs 1/3/4 are already diagnosed (gap-log + working-tree commits). Run the engine **as-if-undiscovered** with existing artifacts held out as ground-truth oracles (recommended), or **reset the consumer/design working trees** to a pre-fix baseline first? This determines whether the gate is a genuine independent test.
2. **Target repo path (§1 Decision 1).** Confirm `/Users/ethannguyen/Data/WorkspaceSWA/shipwithai.io` (branch `feature/new-design`) is the intended target. It has uncommitted changes touching the very files in scope — do we branch (`phase-1/<topic>`) off current HEAD or off a clean baseline?
3. **Gap-log destination (§6).** Confirm reuse of `shipwithai.io/drafts/V0.{N}-STREAM-{X}-GAPS.md` (recommended) vs a design-side `ROADMAP.md` sink. And: which `V0.{N}`/stream label does the Phase-1 round write under?
4. **Engine pin interim (§4).** Approve the local-SHA `git-subdir+file://` pin (with relative-path fallback) as the interim, with the documented one-line migration once the remote exists?
5. **Bug 3 scope.** Confirm the overflow lives in the consumer (`CodePreviewSnippet.astro` / other consumer `pre` renderers), not the design `ArticleBody` (already has `overflow-x:auto`) — i.e. Bug 3 is genuinely a consumer FULL-loop fix, not a second escalation.
6. **Bug 4 dead-code.** OK to **delete** the orphaned React `src/components/reactions/ReactionBar.tsx` as part of the fix (it's the storage-error source and is never hydrated), or only wire `initReactionsBar` and leave the dead file?

---

## 12. Risks

| Risk | Mitigation |
|---|---|
| **Engine pin can't resolve without a remote** | Two-stage strategy (§4): local-SHA `git-subdir+file://`, relative-path fallback, mechanical migration once pushed; drift-monitor asserts HEAD==sha. |
| **CC cannot verify live UI** | Built into the operating model: `handoff/v0` verification-request → Cowork measures live DOM, writes `verified_by`+evidence; ledger blocks at `candidate` until then (`ASSIST_CANNOT_CLOSE`). |
| **Bugs already fixed → fake-green gate** | §0/Q1 ruling: hold existing artifacts as oracles or reset to baseline; engine must reproduce conclusions independently (don't copy the gap-log). |
| **Touching the trust anchor (`ledger-validator.js`) for the hard-lock guard** | Tests-first, mutation-checked, never weaken a guard without replacement; security review; the seam was designed-for in Phase 0 (`hard_lock_violations` already parsed). |
| **`file:`-symlinked design package caching** | env-hygiene recipe: restart `astro dev`, clear `.astro/` + `node_modules/.vite` after organism edits. |
| **Bug 1 accidental consumer edit** | Pack routing forbids `src/**` writes on `root_cause_layer==upstream`; gate asserts empty consumer `git diff`; the refusal is the pass condition. |
| **Quality matrix ≥8.0 on a public-facing pack** | Critic refutation pass + deslop + the full convention gate before PR-out. |
| **2-repo version-sync drift** | 4-key sync enforced in each repo's `run-all.js`; pinned `sha` is the cross-repo anchor. |

---

> **HALT (ADR-0002).** Awaiting Cowork review + Ethan's plan-in approval. On approval, CC executes §10 autonomously to a PR, HALTing again only for live-UI verification handshakes (Cowork) and PR-out (Ethan).
