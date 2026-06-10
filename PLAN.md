# PLAN.md — Generic Astro fix harness, Step 1.1 (Overflow recipe verify-selector fix)

> **Branch:** `phase-1/astro-overflow-verify-fix` in each repo · **Approver:** Ethan · **Status:** awaiting plan-in (ADR-0002 HALT).
> **Author:** Claude Code. Supersedes the Step-1 plan (preserved in git history).
> **Source brief:** `shipwithai-fixkit-design/handoffs/CC-GENERIC-ASTRO-HARNESS-STEP1.1-OVERFLOW-FIX.md`
> (+ context `gate-run-step1.sh`). **Engine** off `main` (@ `0ced12e`, web 0.2.0 merged); **focus** off `master` (@ `c70feb1`, Step-1 merged).
> **Deliverable this round:** this PLAN.md, then **HALT**. No production file edited until Ethan approves.
> **ZERO engine-core / harness change** — this is **recipe text + one eval** only.

This is a narrow correctness fix to ONE recipe, spanning the **engine** (public generic recipe) and the
**focus pack** (overlay note) repos.

---

## 0. The finding (confirmed by a real-browser gate-run, 2026-06-10)

The generic `web/astro-recipes` **Overflow** recipe prescribes the right *fix* (`overflow-x:auto` on the
`<pre>`) but tells the engine to reproduce/verify with the `overflow` measure on `--selector 'pre'`.
Measured (200px box, 300-char line, headless Playwright via `gate-run-step1.sh` PART A):

| variant | `--selector 'pre'` | `--selector 'body'` |
|---|---|---|
| buggy (no rule) | ok:false (sw 2442 / cw 200) | ok:false (sw 2443 / cw 1280) |
| **fix `overflow-x:auto`** | **ok:false (sw 2442 / cw 200)** | **ok:true (sw 1280 / cw 1280)** |
| fix `white-space:pre-wrap` | ok:true (200/200) | ok:true |

`overflow-x:auto` is the **correct** fix (code keeps horizontal scroll, no wrap) — it **contains** the
overflow so the **page root no longer scrolls sideways** (`body` 1280 = 1280). But the `<pre>` itself
stays `scrollWidth > clientWidth` **by design**, so verifying on the `<pre>` can never go green.
**The recipe's reproduce/verify *target* is wrong, not the fix, and not the measure.**

**Root invariant for this change:** the `overflow` measure (`lib/measures.js` `overflow()` reads
`scrollWidth`/`clientWidth` on the selected element) is **correct and untouched** — we only change which
element the recipe tells the engine to *select*.

---

## 1. ENGINE — `shipwithai-fixkit/plugins/shipwithai-fixkit-web/` (branch `phase-1/astro-overflow-verify-fix` off `main`)

**EDIT — `skills/astro-recipes/SKILL.md`, the Overflow recipe only (current lines ~76-91):**
- **Keep** the fix `overflow-x:auto` (the CSS block unchanged).
- **Reframe the symptom:** "a `<pre>` overflows and **pushes the page sideways**; the fix *contains* it
  so the **page root** no longer overflows" (the `<pre>` keeps horizontal scroll by design).
- **Change reproduce/verify target** from the `<pre>` to the document root that must not scroll sideways:
  `--measure overflow --selector 'body'` (generic; `'html'` equivalent). REPRODUCE `ok:false` on `body`
  (page overflows), VERIFY `ok:true` on `body` (contained).
- **Update the CLI example block** accordingly (`--selector 'body'`; REPRODUCE ok:false / VERIFY ok:true
  on body).
- **Update the recipe-index row** (current line 26): keep measure `overflow`, but reframe the symptom
  cell to the page-root framing ("…pushes the page sideways → verify the page root no longer overflows").
- Mirror principle preserved (reproduce & verify the **same** selector — now `body`). Hydration (a)/(b)
  recipes are correct and **unchanged**. Keep < 200 lines, code blocks ≤ 20, the closing NOT-section.

**EDIT — `skills/astro-recipes/evals/evals.json` (one eval):**
- Adjust `astro-recipes-03` (the overflow eval) so it asserts the **page-root** verify: add
  `overflow-x:auto` on the `<pre>`, then verify on `--selector 'body'` that the page no longer overflows
  sideways — noting the `<pre>` keeps `scrollWidth > clientWidth` by design (so the proof is the
  page/container, **not** the `<pre>`). This also satisfies "remove any eval that implies verifying the
  `<pre>` itself for this fix" (only `-03` does). Keep `shouldTrigger:true`.
- Eval count stays **6** (4 trigger / 2 must-not) — still ≥ 5 with the ≥3/≥2 split. Bump the evals.json
  `version` to `0.2.1` in lockstep (cosmetic).

**EDIT — version bump web `0.2.0 → 0.2.1` (patch) + 4-key sync** (gate section 4 requires all equal):
1. `.claude-plugin/plugin.json` → `version`
2. `.claude-plugin/marketplace.json` → top-level `version`
3. same file → `plugins[0].version`
4. root `.claude-plugin/marketplace.json` → the `shipwithai-fixkit-web` entry `version`

**EDIT — `CHANGELOG.md`** — add `## [0.2.1] — 2026-06-10`:
> `fix(astro-recipes): overflow recipe verifies on the page root, not the <pre> — overflow-x:auto
> contains the overflow but the <pre> stays scrollWidth>clientWidth by design.`

---

## 2. FOCUS — `shipwithai-fixkit-focus/plugins/shipwithai-fixkit-pack/` (branch `phase-1/astro-overflow-verify-fix` off `master`)

**EDIT — `packs/shipwithai/astro-recipes.md` (one line, ~line 41):** it currently restates a `<pre>`-verify
target — *"Verify (UI): the web-harness / Cowork measures `scrollWidth <= clientWidth` on the `pre` …"*.
Realign to the page-root approach (or defer to the generic recipe): verify the **page root** no longer
overflows (`--selector 'body'`); the `<pre>` keeps `overflow-x:auto` and stays wider-than-box by design.
Org specifics stay: `.article-body`, org tokens `--radius-md` / `--space-4`, Expressive Code ownership.

**CHECK — `skills/astro-recipes/SKILL.md`:** its Snippet-overflow note gives only the CSS rule + org
tokens (no verify selector) — **no change needed**; it already inherits the verify approach via the
"Overlays `web/astro-recipes`" reference.

**DO NOT TOUCH** — `hard-locks`, `design-consumer-routing`, `component-map.seed`, `env-hygiene`,
ReactionsBar hydration bindings.

**Pack version — decision (default = NO bump):** this is a one-line **doc clarification** with zero
behavior/structure change, and the corrected recipe is carried by the engine pin (web 0.2.1). Default =
ship the note alignment **version-unchanged** (pack stays `0.1.1`; pack 4-key only fails on a *mismatch*,
not on staying put), with a one-line CHANGELOG clarification under `[0.1.1]`. _Alternative_ = patch bump
`0.1.1 → 0.1.2` (full 4-key) if Ethan prefers a discrete release for the overlay edit. **HALT-flagged (§6.1).**

## 2C. POST-MERGE re-pin (separate commit — needs the engine 0.2.1 merge SHA, Ethan)
After the **engine** PR merges, re-pin focus root `.claude-plugin/marketplace.json`: the
`shipwithai-fixkit-web` entry `sha` → new merge commit, `version` `0.2.0 → 0.2.1`; update `_pin_note`
(date, new SHA, "web 0.2.1: overflow recipe verifies on the page root"). `core` stays `0.3.0`; **decision
(§6.2):** align core's `sha` to the same new commit (content byte-identical — the Step-1 precedent) vs.
leave it. _Recommend: align both, single engine SHA._ Not part of the note-alignment commit (SHA doesn't
exist until merge). Sequenced last.

---

## 3. Sequencing (cross-repo)
1. **ENGINE** branch off `main` → §1 → run gates (§4.1) green → conventional commit → **HALT; Ethan
   pushes + PR + merges.**
2. **FOCUS** branch off `master` → §2 note alignment (+ optional bump) → pack gate (§4.2) green → commit →
   **HALT; Ethan pushes + PR.**
3. **POST-MERGE** (engine 0.2.1 merged) → §2C re-pin on the focus branch → pack gate green → Ethan merges.
4. **GATE-RUN** (§4.3): Cowork re-runs `gate-run-step1.sh` (real machine) — overflow now verifies on `body`.

---

## 4. Gate / test commands & acceptance (evidence, not assertions — handoff §2)

### 4.1 Engine gates (from the engine repo root)
- `node plugins/shipwithai-fixkit-web/tests/run-all.js` → exit 0.
- `node plugins/shipwithai-fixkit-web-harness/tests/run-all.js` → exit 0 (Tier A; Tier B SKIPs w/o Playwright).
- `node plugins/shipwithai-fixkit-core/tests/run-all.js` → exit 0.
- **Core trust-anchor byte-unchanged:** `git diff --stat main -- plugins/shipwithai-fixkit-core/lib plugins/shipwithai-fixkit-core/tests` → **empty**.
- **Harness untouched:** `git diff --stat main -- plugins/shipwithai-fixkit-web-harness/lib` → **empty**
  (no `measures.js` / `drive.js` / overflow-measure change).

### 4.2 Pack gate (from the focus repo root)
- `node plugins/shipwithai-fixkit-pack/tests/run-all.js` → exit 0. Quality matrix ≥ 8.0.

### 4.3 Gate-run re-run (Cowork, real machine — `gate-run-step1.sh`)
- **PART A (Overflow):** with the corrected recipe, the proof binds on `--selector 'body'` →
  REPRODUCE `ok:false` (page overflows) / VERIFY `ok:true` (contained), matching the §0 table. The
  `<pre>`-selector numbers are reported as the *why* (stays `ok:false` by design), not the proof.
- **PART B (Hydration):** closes **FULL** unchanged (reproduce `ok:false` → `client:load` → verify
  `ok:true`).

### 4.4 Critic refute pass (fresh subagent, worker ≠ grader)
- Does **any** recipe still tell the engine to verify the **wrapped/scrolling element itself** for a
  containment fix? (grep the Overflow recipe + the pack overlay note for a `<pre>`/`#pre`-verify target).
- Is the Overflow example **internally consistent** — does applying the named fix make the **named
  measure on the named selector** go green (fix ⇒ `body` `ok:true`)?
- Are core/trust-anchor + harness diffs empty?

---

## 5. Scope — what Step 1.1 does NOT do (handoff §3)
- **No change to `lib/measures.js` / `drive.js` / the `overflow` measure semantics** — the measure is
  correct; only the recipe's *target* was wrong.
- No core / trust-anchor change · no new recipe classes · no plugin split / rename.
- **No other recipe touched** — Hydration (a)/(b) are correct as-is; only Overflow changes.

---

## 6. Decisions (APPROVED — Ethan via Cowork, 2026-06-10)
1. **Pack version:** **PATCH BUMP `0.1.1 → 0.1.2`** ✓ — full 4-key + a **discrete** CHANGELOG `[0.1.2]`
   entry. Do **NOT** retroactively edit the `[0.1.1]` entry (released versions are immutable).
2. **§2C re-pin:** **align BOTH** core + web pins to the new engine 0.2.1 merge SHA (single engine SHA) ✓.

**Housekeeping (approved):** `gate-run-step1.sh` is untracked scratch in the engine root — do **NOT**
`git add` it; ignored via `.gitignore` (`gate-run-*.sh`) so it never lands in the public engine PR. The
engine changed-set is kept to: the Overflow recipe + its eval + web version/4-key/CHANGELOG (+ the
`.gitignore` housekeeping line).

**Execution:** ENGINE runs autonomously to green gates (incl. core trust-anchor + harness `lib/` diffs
empty), then **HALT** for Ethan's push/PR. FOCUS (note realign + `0.1.2` bump, then post-merge re-pin)
follows.
