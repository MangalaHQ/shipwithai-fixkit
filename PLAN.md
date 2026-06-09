# PLAN.md — Generic Astro fix harness, Step 1 (contract + seam + decouple)

> **Branch:** `phase-1/astro-generic-decouple` in each repo · **Approver:** Ethan · **Status:** awaiting plan-in (ADR-0002 HALT).
> **Author:** Claude Code. Supersedes the FE-harness-MVP plan (preserved in git history).
> **Source brief:** `shipwithai-fixkit-design/handoffs/CC-GENERIC-ASTRO-HARNESS-STEP1.md` + design SOT `14-SPRINT-PLAN.md` (Sprint 3 frame).
> **Architecture (decided — NOT re-litigated):** **C+ contract** — document a 5-slot framework-module
> contract; Astro is the first impl; the shipwithai pack becomes overlay-only. No plugin split, no
> `web`→`astro` rename, no `locate` impl, **zero engine-core / trust-anchor change**.
> **Deliverable this round:** this PLAN.md, then **HALT**. No production file is edited until Ethan approves.

This plan spans **two repos**: the public **engine** (`shipwithai-fixkit`, branch off `main`) and the
private **pack** (`shipwithai-fixkit-focus`, branch off `phase-5/distribution`).

---

## 0. Goal & invariants

Fix a **boundary** problem, not a mechanism one. The browser harness (`web-harness`) is already generic;
the issues are (1) generic Astro fix-knowledge is trapped inside the **private** pack, and (2) the `web`
adapter has no explicit framework seam. Step 1 introduces the seam (a documented contract), extracts the
**generic** Astro recipes up into the public `web` adapter, and shrinks the pack to an org-specific overlay.

`web` is the **web PLATFORM adapter** (peer of `backend`/`kmp`/`ios` — name is correct, do NOT rename).
Inside it: the **platform spine** stays framework-agnostic; the **Astro framework module** becomes the
first impl of the framework-module contract.

**Hard invariants (hold at every step):**
- **Core trust anchor byte-unchanged:** zero diff under `plugins/shipwithai-fixkit-core/lib/` and core
  `tests/`. Proven with `git diff --stat`.
- **Platform spine stays framework-agnostic:** the spine is **`web-reproduce` + `web-verify` ONLY**
  (plus `capability.json` / `CONNECTORS.md` / handoff emission). They reference "the active framework
  module's runtime/source-map/recipes", never Astro by name. `web-environment` (hardcodes `astro dev` +
  `.astro/` cache) and `web-source-map` (Astro + content-collections table) are **Astro-module** skills,
  **not** spine. Reframe **wording only**, no behavior change.
- **Generic-ness proof = pack ABSENT:** the headline gate-run runs with only `core + web + web-harness`.
  If a "generic" recipe secretly needs `@shipwithai/design`, it fails there.
- **Adapter stays zero-dep:** the contract is a **doc**, not code.

---

## 1. The framework-module contract (the durable abstraction)

**NEW — `plugins/shipwithai-fixkit-web/lib/framework-module.contract.md`** (doc, no code). Defines the 5
slots a web-framework module fills; the platform spine dispatches through them; Astro is the reference
impl. Content mirrors handoff §2:

| Slot | Responsibility | Astro impl (Step 1) |
|---|---|---|
| `detect` | is this project framework X? + version | `astro.config.{mjs,ts}` present / `astro` in deps; read version |
| `runtime` (`~~runtime`) | stand up target + cache discipline | `astro dev --port 4321`; caches `.astro/` + `node_modules/.vite`; `astro preview` fallback (today's `web-environment`) |
| `source-map` | symptom → likely file | today's `web-source-map` table |
| `recipes` | generic framework fix patterns | **NEW** public `astro-recipes` (§2A) |
| `locate` (optional) | rendered node → source component | **reserved, not implemented** (Sprint 3 / B-LOC, `data-astro-source-*`); slot named, left empty |

The doc states the agnostic rule explicitly (spine references slots, never "Astro" as the only option)
and ends with a `## What this contract does NOT do` (no code, no dispatch impl, no `locate`).

---

## 2. File plan — exact adds / edits / shrinks

### 2A. ENGINE — `shipwithai-fixkit/plugins/shipwithai-fixkit-web/`  (branch `phase-1/astro-generic-decouple` off `main`)

**ADD — `skills/astro-recipes/SKILL.md`** · license **MIT** · `user-invocable: true`. Generic Astro
patterns expressed **without `@shipwithai/design`**, each targeting a `browser-drive` measure:
- *Hydration (a):* React island with no `client:*` → add the directive at the usage site. Measure:
  `interaction` (state changes after click).
- *Hydration (b):* the **generic** "an Astro component ships a sibling `*.behavior.ts`; the consumer must
  wire it once with a client `<script>` (Astro does not auto-run island JS)" pattern — using a **generic
  `data-*` example** (e.g. `[data-widget]` + `initWidget`), **NOT** ReactionsBar. Measure: `interaction`
  or `scroll-read-state` (scroll-spy class).
- *Overflow:* a `<pre>` outside a prose container lacking `overflow-x:auto` → mirror with a generic
  `overflow-x:auto` rule (no org tokens). Measure: `overflow` (`scrollWidth ≤ clientWidth`).
- Ends with `## What this skill does NOT do`. Conventions: < 200 lines, inline code ≤ 20 lines,
  `description` < 200 chars.

**ADD — `skills/astro-recipes/evals/evals.json`** — ≥ 5 evals (≥ 3 `shouldTrigger:true` / ≥ 2 false),
each `{id, prompt, expectedBehavior, category, shouldTrigger}`. Must-not examples: a `@shipwithai/design`
organism fix (→ pack overlay), and a pure source-location question (→ web-source-map).

**ADD — `lib/framework-module.contract.md`** (§1).

**EDIT — `CLAUDE.md`** — declare the **2 skill groups (no overlap):**
- (i) *Platform spine — framework-agnostic:* `web-reproduce` + `web-verify` **only** (plus
  `capability.json` / `CONNECTORS.md` / handoff emission).
- (ii) *Astro framework module:* `web-environment` = `runtime` slot, `web-source-map` = `source-map`
  slot, `astro-recipes` = `recipes` slot.

Point at `lib/framework-module.contract.md`. Reframe `web-environment` / `web-source-map` **wording only**
(they move from "spine" to "Astro module" — no behavior change). **NOTE** (not a Step-1 action):
`web-environment`'s generic sub-part (port hygiene / kill-stale-server on 4321) is a **Step-2 extraction
candidate** into an agnostic runtime helper — do **NOT** split it now.

**EDIT — `lib/capability.json`** — append one sentence to the existing `note` pointing at the contract.
UI/Logic/System values **unchanged = FULL** (the gate asserts these literally).

**EDIT — `.claude-plugin/plugin.json`** — add `"./skills/astro-recipes"` to `skills`; bump `version`
`0.1.0` → **`0.2.0`**.

**EDIT — 4-key version sync to `0.2.0`** (gate section 4 requires all four equal):
1. `plugins/shipwithai-fixkit-web/.claude-plugin/plugin.json` → `version`
2. `plugins/shipwithai-fixkit-web/.claude-plugin/marketplace.json` → top-level `version`
3. same file → `plugins[0].version`
4. root `.claude-plugin/marketplace.json` → the `shipwithai-fixkit-web` entry `version`

**EDIT — `CHANGELOG.md`** — add `## [0.2.0] — <date>`: new generic `astro-recipes` skill + framework-module
contract; spine reframed as Astro module slots (no behavior change); recipes extracted from the pack.

> **Why this stays green:** web gate needs `≥ 4` skills (now 5), `≥ 1 user-invocable:false` sub-skill
> (web-reproduce/verify/source-map stay false; astro-recipes is `true` like web-environment), `≥ 5` evals
> per skill (3/2 split) + the closing NOT-section, and the 4-key sync. The contract doc lives in `lib/`
> (the gate only walks `skills/`), so it adds no lint surface.

### 2B. FOCUS — `shipwithai-fixkit-focus/plugins/shipwithai-fixkit-pack/`  (branch `phase-1/astro-generic-decouple` off `phase-5/distribution`)

**SHRINK — `skills/astro-recipes/SKILL.md`** + **`packs/shipwithai/astro-recipes.md`**: remove generic
content (now public in `web`); keep **only** org specialization — the `@shipwithai/design` import path,
`ReactionsBar.behavior.ts`, Starlight Expressive Code body-fence ownership, `.article-body`. Open each
with *"Overlays `web/astro-recipes` — org specialization only."* Keep **≥ 5 evals** (3/2 split) + the org
`## What this … does NOT do`.

**DO NOT TOUCH** — `skills/shipwithai-hard-locks`, `skills/design-consumer-routing`,
`packs/shipwithai/{hard-locks,design-consumer-routing,component-map.seed,env-hygiene,verify-snippet}.*`.
(Pack gate section 3 asserts `astro-recipes.md` still exists + hard-lock ids present — both preserved.)

**Pack version (decision — default = patch bump):** the shrink is a material content change. Default =
bump pack `0.1.0` → **`0.1.1`** with its own 4-key sync (pack `plugin.json` == pack `marketplace.json`
top == `plugins[0]` == focus root `marketplace.json` pack entry) + a pack `CHANGELOG` line. Alternative =
ship version-unchanged (gate stays green — it fails only on a *mismatch*, not on staying at `0.1.0`).
**HALT-flagged (§6.1).**

### 2C. POST-MERGE cross-repo re-pin  (separate commit — needs the engine merge SHA, Ethan)

After the **engine** PR merges to `main`, re-pin the engine in the **focus** root
`.claude-plugin/marketplace.json` (existing `_pin_note` idiom):
- update the `shipwithai-fixkit-web` pinned entry `sha` → the new merge commit, and its `version`
  `0.1.0` → **`0.2.0`**;
- update `_pin_note` (date, new SHA, "web 0.2.0: generic astro-recipes + framework-module contract").
- `core` (0.3.0) + the web-harness pin context stay as-is unless that merge also moved them.

This is **not** part of the pack-shrink commit — it depends on a SHA that does not exist until the engine
PR merges. PLAN sequences it last.

---

## 3. Sequencing (cross-repo)

1. **ENGINE** branch off `main` → apply 2A → run gates (§4.1) green → conventional commit →
   **HALT; Ethan pushes + opens PR + merges.**
2. **FOCUS** branch off `phase-5/distribution` → apply 2B (shrink) → run pack gate (§4.2) green → commit →
   **HALT; Ethan pushes + opens PR.** (2B has no *code* dependency on the engine merge — only 2C does — so
   it can be authored right after step 1, but it should **merge after** the engine so the public recipe
   exists before the overlay points at it.)
3. **POST-MERGE** (engine PR merged): apply 2C re-pin on the focus branch (or a follow-up) → pack gate
   green → commit → Ethan merges.
4. **GATE-RUN** (§4.3): Cowork runs the generic real-Astro-starter proof with the pack **absent**.

---

## 4. Gate / test commands & acceptance (evidence, not assertions — handoff §4)

### 4.1 Engine gates (from the engine repo root)
- `node plugins/shipwithai-fixkit-web/tests/run-all.js` → exit 0 (web adapter gate; equals the handoff's
  `cd plugins/shipwithai-fixkit-web && node tests/run-all.js`).
- `node plugins/shipwithai-fixkit-web-harness/tests/run-all.js` → exit 0 (Tier A always; Tier B SKIPs w/o Playwright).
- `node plugins/shipwithai-fixkit-core/tests/run-all.js` → exit 0 (core gate, untouched).
- **Trust-anchor byte-unchanged:**
  `git diff --stat main -- plugins/shipwithai-fixkit-core/lib plugins/shipwithai-fixkit-core/tests` → **empty**.

### 4.2 Pack gate (from the focus repo root)
- `node plugins/shipwithai-fixkit-pack/tests/run-all.js` → exit 0. Pack quality matrix ≥ 8.0.

### 4.3 Generic gate-run — the headline proof (Cowork-run in a real browser)
On a **real external Astro starter** (`npm create astro@latest -- --template blog`, or a popular theme),
with **only `core` + `web` + `web-harness` installed — the pack ABSENT** + `npx playwright install chromium`:
- **(a) dead interactive island** (missing `client:*`) → fix → close **FULL** via
  `node plugins/shipwithai-fixkit-web-harness/lib/drive.js --measure interaction …` (`interaction-assertion`).
- **(b) code-block `<pre>` overflow at 375px** → fix → close **FULL** via `--measure overflow …`
  (`dom-assertion`, `scrollWidth ≤ clientWidth`).
Report exact commands + observed numbers. The pack being absent IS the generic-ness proof. (CC's job is
to make this runnable + green; Cowork owns the Chrome step.)

### 4.4 No-regression check
The shrunk pack still fully expresses the BUG-003 (overflow) and BUG-004 (hydration) consumer fixes —
re-validate both ledgers **conceptually** against the new overlay (org import path + ReactionsBar +
`.article-body` still named in the pack; the generic mechanics now cited from `web/astro-recipes`).

### 4.5 Critic refute pass (fresh subagent, worker ≠ grader)
- *Is any "generic" recipe secretly org-specific?* — grep `web/astro-recipes` for `@shipwithai`,
  `ReactionsBar`, `article-body`, brand tokens → must be **zero**.
- *Is the contract framework-agnostic?* — grep the spine skills + contract for Astro-only hardcoding that
  should be slot-dispatched.
- *Did the pack lose org specificity?* — the shrunk pack must still name the `@shipwithai/design` path +
  ReactionsBar + Expressive Code.

---

## 5. Scope — what this PLAN does NOT do (handoff §5)

- No `locate` / component-locator impl (Sprint 3 / B-LOC) — the contract only **names** the reserved slot.
- No plugin split, no `web`→`astro` rename (Step 2, when Next.js arrives).
- No content-collection-cache / routing / build recipe classes — scoped to UI-render core.
- No other frameworks.
- **No core / trust-anchor change** (`lib/ledger-validator.js` + core `tests/` byte-unchanged).
- No edits to pack `hard-locks` / `design-consumer-routing` / `component-map.seed` / `env-hygiene`.

---

## 6. Decisions (APPROVED — Ethan via Cowork judgement pass, 2026-06-09)

1. **Pack version on shrink:** patch bump `0.1.0` → `0.1.1` ✓ (with 4-key sync + CHANGELOG; the pinned set
   keeps behavior — the `web ≥ 0.2.0` floor is encoded by the 2C re-pin).
2. **Gate-run starter:** official `astro blog` template ✓.
3. **Re-pin timing (2C):** same focus branch, post-merge commit (one PR) ✓.

**②-resolved (collision check):** `phase-5/distribution` is **already merged** (focus PRs #1 + #2 both
MERGED; branch tip `60229a3` = the merged H4 re-pin). Cutting the Step-1 focus branch off it is current,
and the 2C `_pin_note` edit does **not** collide with an open phase-5 PR — decision 3 stands, no rebase.

**Required amendment ① applied:** the skill grouping is now non-overlapping — spine = `web-reproduce` +
`web-verify` only; Astro module = `web-environment` + `web-source-map` + `astro-recipes`
(`web-environment` port-hygiene noted as a Step-2 extraction candidate, not split now).

**Execution:** Phase 1 (engine) runs autonomously to green gates, then **HALT** for Ethan's push/PR.
Phases 2 + 3 follow after.
