# PLAN.md — FE fix harness MVP (`~~browser` Playwright binding)

> **Branch:** `phase-1/web-harness` off `main` · **Approver:** Ethan · **Status:** awaiting plan-in (ADR-0002 HALT).
> **Author:** Claude Code (consensus: Planner → Architect → Critic). Supersedes the P4 plan (preserved in git history).
> **Goal:** make `/shipwithai-fixkit-core:fix` close front-end **UI** bugs *autonomously* by giving the
> engine a real, in-loop `~~browser` connector — a headless **Playwright** runner — so CC can
> REPRODUCE and VERIFY UI bugs itself and the ledger reaches `closed` at UI `capability_tier: FULL`
> with no human in the inner loop.

This plan adds **one new plugin + one connector inversion**. The engine and the web adapter already
exist; this build inverts the `~~browser` binding from "human-driven Chrome" to "in-loop Playwright."

---

## 1. Ground truth (verified this session — the plan rests on these, not on assumption)

| Claim | Verified at | Result |
|---|---|---|
| Validator binds all 5 UI methods to the UI layer | `core/lib/ledger-validator.js:21-25` | ✅ `UI: [browser-assertion, computed-style, dom-assertion, console-assertion, interaction-assertion]` |
| `closed` requires FULL + evidence + verified_by + layer-method match | `ledger-validator.js:64-92,159-169` | ✅ `ASSIST_CANNOT_CLOSE`, `INTEGRITY_EVIDENCE_EMPTY`, `INTEGRITY_VERIFIER_MISSING`, `VERIFICATION_LAYER_MISMATCH` all enforced |
| Web adapter already declares `UI: FULL`, conditional on `~~browser` | `web/lib/capability.json` | ✅ note: "UI FULL is conditional on `~~browser` … absent it downgrades to ASSIST → candidate" |
| Web recipes call `~~browser` abstractly; CONNECTORS resolves it | `web/skills/web-reproduce,web-verify/SKILL.md`, `web/CONNECTORS.md:8-12` | ✅ recipes are stack-tool-agnostic; `~~browser` primary = "Claude in Chrome", *Playwright MCP already listed as an alternative* |
| No plugin binds Playwright today | grep `playwright\|puppeteer` across `plugins/` | ✅ none — harness is the first |
| Playwright runs in this sandbox | `npx playwright@1.60.0` resolved; `node v24.4.0` | ✅ runnable, but it is a **dependency + browser binaries** (see §6 — the one real tension) |

**Conclusion: zero core-engine / validator change is required (handoff §4 confirmed).** The validator
already enforces every close criterion; the MVP only needs to make `~~browser` *resolvable in-loop*.
`core/lib/ledger-validator.js` and `core/tests/run-all.js` are **NOT touched** by this build.

---

## 2. The seam — what actually changes

```
/fix spine ──REPRODUCE/VERIFY──▶ web-reproduce / web-verify   (web adapter recipes — UNCHANGED)
                                        │  call ~~browser
                                        ▼
                        web/CONNECTORS.md  ~~browser row  ◀── INVERSION (only edit to the web adapter)
                          primary  = web-harness Playwright runner (in-loop, auto-close)
                          fallback = Claude in Chrome / Cowork live-DOM (final real-env spot-check)
                                        │ resolves to
                                        ▼
              shipwithai-fixkit-web-harness  (NEW PLUGIN — pure mechanism)
                 lib/drive.js  ── Playwright headless ──▶ astro dev :4321
                 emits { method ∈ UI LAYER_METHODS, evidence: <observed numbers> }
                                        │
                                        ▼
                          .fixkit ledger  → validator → closed @ FULL (autonomous)
```

Two edits ship the capability:
1. **NEW plugin** `plugins/shipwithai-fixkit-web-harness/` — the Playwright `~~browser` mechanism.
2. **ONE inversion** in `plugins/shipwithai-fixkit-web/CONNECTORS.md` — `~~browser` primary becomes
   the harness runner; Cowork live-Chrome is demoted to a final spot-check. (Plus a one-line note in
   `web/capability.json` that the `~~browser` precondition is now satisfiable in-loop — text only, the
   FULL/ASSIST values are unchanged.)

**How the agent resolves `~~browser` at runtime (no code wiring — by convention):** `~~browser` is a
*prompt-level* placeholder. The orchestrator (`core/commands/fix.md`) and the `ui-bug-agent` read the
web adapter's `CONNECTORS.md` as text to learn what `~~browser` maps to. The inverted row must cite the
**exact CLI surface** of the harness runner so the agent invokes it unambiguously via Bash:
`node plugins/shipwithai-fixkit-web-harness/lib/drive.js --url <url> --measure <type> --selector <sel>`.
The `browser-drive` sub-skill is `user-invocable:false` (it is mechanism the engine drives, not a
user command); its `SKILL.md` documents that exact CLI surface + the JSON output shape so resolution
across the two sibling plugins is explicit, not inferred. (Architect R2.)

The harness is **mechanism only**. It does not classify bugs, pick the proof method, or edit app
source — `triage` / `verification` / the layer-agents (all in core) do that.

---

## 3. The harness plugin layout

```
plugins/shipwithai-fixkit-web-harness/
  .claude-plugin/{plugin.json, marketplace.json}     # 4-key version sync with root marketplace
  manifest.json
  CONNECTORS.md          # declares THIS plugin is the ~~browser primary binding (Playwright)
  CLAUDE.md              # config profile: ports(4321), viewport matrix(1280/768/375), timeouts — NOT hardcoded in the skill
  README.md  CHANGELOG.md
  lib/
    drive.js             # thin Node Playwright runner: navigate → measure → emit {method, evidence}
    measures.js          # the 5 LAYER_METHODS helpers (1:1 with the 5 UI methods); pure shaping, browser-free where possible
  skills/
    browser-drive/
      SKILL.md           # user-invocable:false — the ~~browser recipe surface (how to call drive.js)
      evals/evals.json   # >=5 evals (>=3 trigger / >=2 must-not)
  tests/
    run-all.js           # the harness's OWN gate (quality limits ALWAYS; Playwright smoke CONDITIONAL — §6)
    lib/frontmatter.js   # mirrored from the web adapter gate
  evals/fixtures/
    smoke-page/          # a trivial static HTML page: a known-overflowing <pre> + a dead button
```

Composed **by convention** (slash-path refs + a `user-invocable:false` sub-skill), never by
`plugin.json` dependency wiring. Every skill/agent ends with `## What this … does NOT do`.

---

## 4. The `~~browser` recipe contract (what `browser-drive` exposes)

`lib/drive.js` is invoked as a CLI by CC in-loop. It takes a target URL + a measurement request and
returns a single JSON line `{ method, ok, evidence }` where `method` is exactly one of the five UI
`LAYER_METHODS` and `evidence` carries the **observed numbers** (so the close proof is non-circular).

| Recipe (mirrors `web-reproduce`/`web-verify`) | Playwright mechanism | Emits `method` | `evidence` (observed) |
|---|---|---|---|
| layout / overflow | `el.scrollWidth` vs `el.clientWidth` via `page.evaluate` | `dom-assertion` | `{scrollWidth, clientWidth, overflow:bool}` |
| visual / styling | `getComputedStyle(el)` read | `computed-style` | `{prop, value}` |
| client-runtime | capture `console` errors/warnings on load | `console-assertion` | `{messages:[…]}` |
| interaction / behavior | `page.click()` then read post-state DOM | `interaction-assertion` | `{before, after}` |
| responsive | re-measure across the viewport matrix | `browser-assertion` | `{perWidth:{1280,768,375}}` |

**Failure / timeout shape (Critic gap):** on a navigation/selector/timeout failure `drive.js` exits
**non-zero** and emits `{ ok:false, error:<reason> }` with **no `method`** — so a failed observation can
never be mistaken for proof, and the layer-agent records a fix-failure (feeding the engine's 3-strikes),
never a close. A successful observation always carries both `method` and `evidence`.

The runner stands up the target via the adapter's `~~runtime` (`astro dev :4321`) — it does **not**
embed the server command; it receives the URL. Reproduce and verify call the **same** helper with the
**same** selector — verify asserts the mirrored result. The numbers `drive.js` returns are what the
layer-agent writes into `verification.evidence`, and the `method` string it returns is written verbatim
into `verification.method`; the validator already refuses a close without evidence and refuses a UI
method outside its `LAYER_METHODS` set.

**The method string is THE coupling point (Architect R1/S1).** `verification.method` must be byte-exact
one of the five hyphenated UI strings or the validator raises `VERIFICATION_LAYER_MISMATCH`. To prevent
silent drift, `measures.js` does **not** hardcode the strings — its unit test asserts every emitted
`method` is a member of `LAYER_METHODS.UI` imported from core via a sibling `require(
'../../shipwithai-fixkit-core/lib/ledger-validator')` (zero-dependency; no npm). On `verified_by`: the
validator only checks non-blank (no enum), so the layer-agent records itself plus the runner
(e.g. `ui-bug-agent (web-harness/playwright)`) — confirmed legal by reading the validator, see §1.

---

## 5. Tests-first plan — the harness's own gate (tests written before the runner)

The harness gets its **own** deterministic gate `tests/run-all.js`, mirroring the web adapter's gate
structure (`web/tests/run-all.js`). Built **tests-first**:

**Tier A — deterministic quality limits (ALWAYS run, zero-dependency — this is the CI-green anchor):**
- **≥ 1 skill present** — *intentional departure* from the web/core gate's `≥ 4` (those plugins are
  multi-recipe adapters; the harness is a **single-purpose mechanism** plugin with one job: drive a
  browser). The harness gate hard-codes `≥ 1`, not a copy of `≥ 4`, and this is stated so a future
  "mirror check" reads it as deliberate, not drift (Critic Major #1). The contract requires `≥ 1
  user-invocable:false` sub-skill — `browser-drive` satisfies it; having **zero** user-invocable skills
  is valid for a pure-mechanism plugin the engine drives (it is not a human command surface).
- every `SKILL.md` < 200 lines; max fenced block ≤ 20 lines; `description` < 200 chars; ends with
  `## What this … does NOT do`; ≥ 1 `user-invocable:false` sub-skill.
- `browser-drive` evals: ≥ 5 objects with `{id,prompt,expectedBehavior,category,shouldTrigger}`,
  split ≥ 3 trigger / ≥ 2 must-not.
- **4-key version sync**: `plugin.json` == per-plugin `marketplace.json` top == `plugins[0]` == root
  `marketplace.json` entry.
- **Pure-helper unit test:** `measures.js` shapes a known geometry input into the right `{method,
  evidence}` with **no browser** — the deterministic proof the contract is honored. The test pins each
  emitted `method` against `LAYER_METHODS.UI` imported from core's validator (sibling `require`, no npm)
  so the strings cannot drift (Architect S1).
- **Cross-plugin contract test (Architect R1 — closes the phantom-dependency gap):** a checked-in
  fixture ledger (`evals/fixtures/`) populated exactly as the layer-agent would from `drive.js` output
  (`verification.method` + `verification.evidence` + `capability_tier: FULL` + `verified_by`) is run
  through core's `validateLedger()` (imported via sibling `require`) and asserted to pass — and a
  negative twin with a drifted method string is asserted to fail `VERIFICATION_LAYER_MISMATCH`. This is
  the only test that exercises the harness→validator contract end-to-end, and it is zero-dependency.

**Tier B — Playwright smoke (CONDITIONAL — see §6):** if `require('playwright')` + a browser binary
resolve, launch headless against `evals/fixtures/smoke-page/`, assert each of the 5 helpers emits its
`method` + non-empty `evidence` on the live page **and asserts polarity** — the fixture's broken `<pre>`
/ dead button yield `ok:false`, and a fixed variant yields `ok:true` (Critic gap: a helper that always
returns `ok:true` would be a useless proof). If Playwright/binary is **absent**, print
`SKIP — playwright not installed` and **do not fail**. The gate's green does not depend on Tier B.

No change to `core/lib/ledger-validator.js` or `core/tests/run-all.js`. **Conditional escape hatch:**
if (and only if) the build discovers a genuinely new proof binding is needed, that is a *separate*
tests-first validator change (failing fixture first, mutation-checked, no guard weakened) that
**re-HALTs to Ethan** — default expectation: not needed.

---

## 6. The one real tension → a decision for Ethan (HALT point)

The repo identity is **"zero-dependency Node, no package manager, deterministic gate"** (root
`CLAUDE.md`). Playwright is a **real dependency** (npm package + a Chromium browser binary). This
collides with that identity in exactly one place: **can the harness gate be deterministically green in
CI without Playwright installed?**

**Proposed resolution (baked into §5):** split the gate. Tier A (quality limits + version sync +
pure-helper unit test) is zero-dependency and is the deterministic green core CI relies on. Tier B
(the live Playwright smoke) is **opt-in**: it runs and proves the runner where Playwright is present
(local dev, the fixture run) and **skips cleanly** where it is not. Playwright is a **documented
prerequisite** in the harness `CLAUDE.md`/`README` (`npx playwright install chromium`) — **not
vendored**, and **not added** to any package manifest at repo root.

**Ethan's call (please confirm in plan-in):**
- **(default, recommended)** Split gate — Tier A deterministic/zero-dep, Tier B conditional smoke.
- **(alt)** Playwright is a *hard* prerequisite of the harness gate (gate fails if absent). Cleaner
  proof, but the harness gate is then non-deterministic in a clean CI checkout — contradicts the
  repo's deterministic-gate property unless CI installs Playwright in a setup step.

Everything else in this plan is independent of which option you pick; only §5 Tier B wording changes.

**Optional Tier C (Architect S2 — recommended add-on, not blocking):** a separate CI job
(`.github/workflows/harness-smoke.yml`) that installs Playwright and runs Tier B, triggered only on
changes under `plugins/shipwithai-fixkit-web-harness/`. This keeps the default plugin gate
zero-dependency/deterministic **and** gives CI-level proof the runner actually runs where it matters —
resolving the steelman objection that Tier B is otherwise never exercised in CI. Touching
`.github/workflows/` is in the security-review scope (§7).

---

## 7. Security review (required before merge)

The harness **executes target code** (launches a browser + drives a dev server in the sandbox). Per
the repo's development-workflow rule, a **security-review pass** is required before adding
`manifest.json` / `assets/` / any `.claude/hooks/` to the harness. Scope: the `drive.js` CLI surface
(no arbitrary-URL / arbitrary-shell injection; bounded to the adapter's target + selector), Playwright
launch flags (headless, no remote debugging port exposed), and the fixture page (static, local).

---

## 8. Critic plan (worker ≠ grader)

A **fresh** critic (not the implementing context) verifies before "done":
1. **Mechanized:** harness gate Tier A green (zero-dep); `measures.js` unit test green; core gate
   **still green and byte-unchanged** (`git diff` on `core/` empty); 4-key version sync holds; every
   `.fixkit/*` ledger produced passes the engine validator (exit 0).
2. **Judgment (the anti-circularity check):** for the demo fixture (§9), the critic confirms each
   diagnosed root cause **matches the planted defect** (from the Ethan-only appendix) and that
   reproduction asserts the **symptom/behavior**, not the patched lines — no "make the test I just
   wrote pass." The two UI bugs must reach `closed` at `FULL` with the Playwright **measurement** (not
   a diff) recorded as `verification.evidence`.

The critic is a separate agent/context from the implementer (the repo's "worker ≠ grader" rule).

---

## 9. Demo-target fixture (built by Cowork AFTER this HALT — out of scope for *this* plan)

Per the handoff, a disposable Astro app (`fixkit-fe-astro/`) seeded with one symptom-only bug per
class (no failing tests attached — the loop must REPRODUCE itself). Planted root causes live in a
critic/Ethan-only appendix. The four bugs exercise the close matrix: 2 UI (→ now `closed` at FULL via
Playwright, previously capped at `candidate`), 1 System, 1 Logic (already FULL via shell/test-runner).
**This plan does not build the fixture or the ledgers** — it builds the harness + inversion that make
the two UI closes possible. The end-to-end fixture run is the *acceptance demo* that follows plan-in.

---

## 10. Scope boundary (what this build does / does NOT do)

**Does:** the new harness plugin (green Tier-A gate) at initial version **`0.1.0`** (matching the other
adapters); a **`shipwithai-fixkit-web-harness` entry added to the root `.claude-plugin/marketplace.json`
plugins array** (required or the 4-key version-sync check fails on key 4 = `NOT_FOUND` — Critic Major
#2); the `web/CONNECTORS.md` `~~browser` inversion; the recipe contract for the 5 UI methods; the
harness's own tests-first gate; a security-review pass.

**Does NOT:**
- change `core/lib/ledger-validator.js`, `core/tests/run-all.js`, or the spine;
- build Next/Vite/Svelte/Nuxt adapters (only the stack-agnostic *seam* is reused later);
- touch the org pack, hard-locks, or the live `shipwithai.io` bugs;
- make Cowork live-Chrome the primary UI proof (it becomes a final spot-check only);
- build the `fixkit-fe-astro` fixture or its 4 ledgers (that is the post-HALT acceptance demo).

---

## ADR — `~~browser` in-loop Playwright binding

- **Decision:** ship the `~~browser` connector as a NEW shared `shipwithai-fixkit-web-harness` plugin
  (a thin headless Playwright runner emitting the 5 UI `LAYER_METHODS` with observed-number evidence),
  and invert the web adapter's `~~browser` row so the runner is primary and Cowork live-Chrome is a
  final spot-check. No core/validator change.
- **Drivers:** time-to-fix (UI bugs close autonomously, not capped at `candidate`); reuse (one runner,
  thin per-stack adapters later); the trust anchor stays untouched (the validator already enforces close).
- **Alternatives considered:**
  (a) *Extend the web adapter in place* — rejected: couples the reusable runner to Astro; the handoff
  wants a shared engine plugin reused by every web stack.
  (b) *Keep Cowork live-Chrome primary* — rejected: keeps a human in the inner loop; UI stays at
  `candidate`, defeating the goal.
  (c) *Add a new validator proof method for "playwright"* — rejected & unnecessary: the 5 UI methods
  already cover the measurements; a new binding would be an unjustified trust-anchor change.
- **Why chosen:** smallest change that flips UI from ASSIST→FULL in-loop while leaving the deterministic
  trust anchor byte-unchanged; the dependency cost (Playwright) is contained behind a split gate.
- **Consequences:** the harness introduces a non-vendored Playwright prerequisite (managed via the §6
  split gate); a security review is owed (it executes target code); the fixture demo (§9) is the
  end-to-end acceptance that follows plan-in. **Trust limitation (Architect S3):** the validator gates
  close on a non-blank `verified_by` and a layer-valid `method`, but carries **no provenance field** —
  it cannot machine-distinguish "FULL proven by Playwright" from a dishonestly-claimed FULL. Trust lives
  in the layer-agent writing the ledger honestly (and in the recorded evidence numbers being real
  measurements), not in the validator policing how FULL was reached. The cross-plugin contract test (§5)
  and the critic's anti-circularity check (§8) are the compensating controls; a machine-checked
  provenance field would be a *separate* tests-first validator change and is out of scope here.
- **Follow-ups:** Next.js as the second Phase-A stack; the `fixkit-fe-astro` 4-bug acceptance demo;
  Ethan runs any git push / publish (sandbox has no auth).

---

## RALPLAN-DR summary (pre-review)

**Principles:** (1) the trust anchor stays byte-unchanged — capability comes from mechanism, not from
weakening a guard; (2) compose by convention, not by dependency wiring; (3) the proof is the observed
number, never a source diff; (4) the deterministic gate must stay deterministic (dependency contained).

**Decision drivers (top 3):** time-to-fix on UI bugs · reuse across web stacks · zero core change.

**Viable options:** [chosen] new shared harness plugin + CONNECTORS inversion · [alt-a] extend web
adapter in place · [alt-b] keep Cowork-Chrome primary. Alts invalidated in the ADR (coupling; human in
the loop).

**Open decision for Ethan (§6):** split gate (default) vs Playwright-as-hard-prerequisite.
