# PLAN.md — Phase 2: backend adapter (`shipwithai-fixkit-backend`)

> **For agentic workers:** REQUIRED SUB-SKILL — use `superpowers:subagent-driven-development`
> (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.
>
> **Status:** ⛔ **AWAITING PLAN-IN APPROVAL (Ethan).** ADR-0002: produced, then HALT. No code,
> no branch, until approved. After approval: autonomous to PR (the adapter), then a separate
> deferred real-bug gate run once Ethan names the target (§9 Decision 1).
> **Supersedes:** the Phase-1 `PLAN.md` (preserved in git history @ `2634357` and ancestors).
> **Engine baseline:** `shipwithai-fixkit` @ `2634357` on `master` (P0 core v0.2.0 + P1 web v0.1.0;
> gates green — core 78, web 34).
> **Source of truth (confirmed reachable, no HALT):** `../shipwithai-fixkit-design/09` §§6–7,9,11 +
> `../shipwithai-fixkit-design/10` (Phase-2 + cross-phase bar); the P1 web adapter as the shape
> reference; core `lib/ledger-validator.js` (the trust anchor reused, never weakened).

**Goal:** Ship `plugins/shipwithai-fixkit-backend/` — a **thin** adapter (mappings + recipes +
declarations, **no debugging logic**) declaring **Logic = FULL, System = FULL, UI = NONE**, with
two deterministic stub fixtures and negative tests wired into a new blocking gate, so the engine
gains a second full-loop platform without touching core/agents.

**Architecture:** Mirror the P1 web adapter exactly (`CONNECTORS.md` + `lib/capability.json` + four
recipe skills + own `tests/run-all.js`). Backend differs from web in three ways only: (1) capability
is Logic/System FULL and **UI NONE** (UI bugs are *refused*, re-routed at triage); (2) the gate adds
a **second** stub-fixture lifecycle (a `System`/integration boundary-log fixture beside the `Logic`
test fixture); (3) the gate adds a **negative-test section** that runs synthetic ledgers through
core's real validator to prove Logic/System proof-binding + UI refusal. The trust anchor stays in
core; the adapter gate *reuses* it.

**Tech stack:** Markdown skills + JSON declarations + zero-dependency Node fixtures/gate (node test
runner = `node <file>` exit code, the established stub pattern). Python only if a hook is touched
(none here).

---

## 0. Why this shape (read once, then skip to §8)

Doc 09 §9 — an adapter is **thin**: `CONNECTORS.md` (placeholder→tool map) + `capability` declaration
+ `environment`/`reproduce`/`verify` recipes + `source-map hints`. Doc 09 §6 — capability tiers
FULL/ASSIST/NONE; **NONE ⇒ the bug is not accepted by this adapter** (UI here). Doc 09 §7 — the
verification matrix: **Logic** reproduces by a failing automated test, verifies by that test passing +
suite green (`~~test-runner`); **System** reproduces in the failing env with **instrumented
boundaries**, verifies by correct boundary logs + pipeline green (`~~ci`/`~~monitoring`). Doc 10 §P2
— done = a real backend logic bug + a real integration bug each reach `closed` with test + log
evidence; CI green. The cross-phase bar (doc 10) — ADR-0002, CI limits, `## What this does NOT do`
everywhere, negative tests pass, quality matrix ≥8.0, CHANGELOG + versions bumped, evidence not
assertions.

**Key reuse decision:** the backend gate `require()`s core's `lib/ledger-validator.js` for its
negative tests. Rationale: the ledger state machine is the **single source of truth** for bug state
(core `CLAUDE.md`); duplicating its rules in the adapter would create drift. The web gate already
reaches across the plugin boundary in tests (it reads the root `marketplace.json`), so cross-plugin
*test-time* references are an established pattern. This is a **test-time** dependency only — the
adapter ships **no** runtime dependency on core (composition stays by convention, doc 09 §12).

---

## 1. Decisions locked / carried (handoff §1) + plan-in fills

| # | Decision | Value |
|---|---|---|
| 1 | Real-bug target repo | **TBD — Ethan fills at gate-run.** Build adapter + stub fixtures now; run the real-bug gate (§9) when the target is named (repo path + test runner + where the two real bugs come from). |
| 2 | P1 close-out (BUG-004 env, deploy, prod re-check) | Runs in parallel — **not this plan's task** (Cowork/Ethan). |
| 3 | Remotes / focus pin | Engine-local; P2 needs no pin changes. Proceed even if the engine remote is not yet pushed. |
| 4 | Branch | `phase-2/backend-adapter` off `master` @ `2634357` (created in Task 0, **after** approval). |
| 5 | Plan-in fill — negative-test home | The three negatives (§5) live in the **backend adapter's own** `tests/run-all.js`, exercising core's validator. Core's `run-all.js` and guards are **untouched** (handoff §5: touch core only to *add* checks; here we add zero — we *consume* the existing guards). |
| 6 | Plan-in fill — stub fixture method analogs | Logic fixture → proof method `failing-test-passes`; integration fixture → proof method `instrumented-boundary` (both are valid `LAYER_METHODS` in core's validator — verified against `lib/ledger-validator.js`). |

**Open questions for plan-in (answer before / at approval — see §10):** Q1 (verified-vs-closed
evidence gating), Q2 (real-bug target), Q3 (publish-trigger branch mismatch).

---

## 2. Complete file tree (all NEW; core/web untouched)

```
plugins/shipwithai-fixkit-backend/
├── .claude-plugin/
│   ├── plugin.json                    # name, skills[], version 0.1.0
│   └── marketplace.json               # per-plugin marketplace (4-key sync)
├── manifest.json                      # skills registry (mirror web)
├── CLAUDE.md                          # adapter runtime guidance
├── CONNECTORS.md                      # ~~test-runner/~~ci/~~monitoring/~~runtime/~~source control
├── README.md
├── CHANGELOG.md
├── lib/
│   └── capability.json                # {UI:NONE, Logic:FULL, System:FULL, note}
├── skills/
│   ├── backend-environment/           # user-invocable: stand up/locate target + hygiene
│   │   ├── SKILL.md
│   │   └── evals/evals.json
│   ├── backend-reproduce/             # sub-skill (user-invocable:false)
│   │   ├── SKILL.md
│   │   └── evals/evals.json
│   ├── backend-verify/                # sub-skill
│   │   ├── SKILL.md
│   │   └── evals/evals.json
│   └── backend-source-map/            # sub-skill
│       ├── SKILL.md
│       └── evals/evals.json
├── evals/fixtures/
│   ├── backend-stub-logic/            # Logic: failing test -> passes
│   │   ├── buggy.js
│   │   ├── fixed.js
│   │   ├── reproduce.test.js
│   │   ├── verify.test.js
│   │   └── README.md
│   └── backend-stub-integration/      # System: boundary-log assertion
│       ├── buggy.js
│       ├── fixed.js
│       ├── reproduce.test.js
│       ├── verify.test.js
│       └── README.md
└── tests/
    ├── lib/frontmatter.js             # verbatim copy of web's shared parser
    └── run-all.js                     # the backend blocking gate (6 sections)
```

Plus edits to TWO existing files (additive only):
- Root `.claude-plugin/marketplace.json` — add a 3rd plugin entry.
- Root `CHANGELOG.md` — add the P2 entry.

---

## 3. Recipe → connector mapping (doc 09 §7, handoff §2)

| Core `~~category` | Backend concrete (primary) | Alternatives | Powers |
|---|---|---|---|
| `~~test-runner` | `npm test` | `vitest`, `jest`, `pytest`, raw `node <file>` exit code | **Logic FULL** |
| `~~ci` | GitHub Actions | local shell build/run | **System FULL** (pipeline) |
| `~~monitoring` | structured stdout/stderr boundary logs | Sentry-class MCP, log files | **System FULL** (boundary evidence) |
| `~~runtime` | local service / dev server | container, in-process harness | reproduce env |
| `~~source control` | git + GitHub | local `git` | diffs / history (never the proof) |

**Layer → recipe:**
- **Logic (FULL):** reproduce = *a failing automated test, written first, that fails on the bug*;
  verify = *that test passes + the full suite is green*.
- **System (FULL):** reproduce = *reproduce in the failing env + instrument the boundaries
  (request/response, queue, DB edge) — log at the seam before touching code*; verify = *the
  instrumented boundary logs the correct value + the pipeline is green*.
- **UI (NONE):** **refused.** `backend-reproduce`/`backend-verify` have no UI recipe; a UI-symptom
  bug is re-routed at triage to a UI-capable adapter (doc 09 §6).

**Mirror principle (doc 09 §7):** every `backend-verify` recipe re-runs the *same observation*
`backend-reproduce` used — a Logic bug reproduced by a failing test is verified by that test passing;
a System bug reproduced by a boundary log is verified by that boundary log, **never by a source
diff** (core enforces `VERIFICATION_LAYER_MISMATCH`).

---

## 4. Stub-fixture design (deterministic gate coverage before a real target exists)

Mirrors the P0 `stub-adapter` / P1 `web-stub` lifecycle (reproduce-FAILS-on-buggy →
verify-PASSES-on-fixed), but **two** fixtures — one per FULL layer:

1. **`backend-stub-logic`** — a synthetic off-by-one in `sumRange(n)` (should be `1+…+n`).
   `reproduce.test.js` asserts `sumRange(5)===15` against `buggy.js` → **fails** (the failing test IS
   the reproduction). `verify.test.js` runs the same assertion against `fixed.js` → **passes** (the
   passing test IS the `failing-test-passes` evidence).
2. **`backend-stub-integration`** — a synthetic boundary bug: a request handler that fails to
   normalize a trailing slash, so the **instrumented boundary log** records the wrong
   `normalizedPath`. `reproduce.test.js` instruments the boundary (a `log` array) and asserts the
   record is correct against `buggy.js` → **fails**. `verify.test.js` re-runs the same boundary
   assertion against `fixed.js` → **passes** (the boundary record IS the `instrumented-boundary`
   evidence).

Both are zero-dependency Node; both run via `node <file>` exit code, exactly like the existing stubs.

---

## 5. Negative tests (the Phase-2 acceptance suite, mechanized now — handoff §3)

All three run inside the backend gate by feeding synthetic ledgers to core's **real**
`validateLedger`. They prove the adapter cannot launder a bad close past the engine's guards. (Proof
methods used are real `LAYER_METHODS` from `lib/ledger-validator.js`: Logic = `failing-test-passes`;
System = `instrumented-boundary`.)

| # | Negative claim | Mechanization (core guard fired) |
|---|---|---|
| (a) | A **Logic** bug cannot reach `verified` without a recorded failing-test proof | a1: Logic@`verified` with a System method (`instrumented-boundary`) → **`VERIFICATION_LAYER_MISMATCH`**. a2: Logic@`closed` with `failing-test-passes` but empty evidence → **`INTEGRITY_EVIDENCE_EMPTY`**. a3 control: Logic@`closed`, `failing-test-passes`, evidence+verifier present → **ACCEPTED**. |
| (b) | A **System** bug cannot reach `verified` without boundary-log evidence | b1: System@`verified` with a Logic method (`failing-test-passes`) → **`VERIFICATION_LAYER_MISMATCH`**. b2: System@`closed` with `instrumented-boundary` but empty evidence → **`INTEGRITY_EVIDENCE_EMPTY`**. b3 control: System@`closed`, `instrumented-boundary`, evidence+verifier present → **ACCEPTED**. |
| (c) | A **UI-symptom** bug is **refused** by this adapter (capability NONE) | `capability.json.UI === 'NONE'`; the gate's `accepts(layer) = cap[layer] !== 'NONE'` returns `false` for UI, `true` for Logic/System. |

Note (Q1): core today evidence-gates **`closed`** (not `verified`); the layer-method binding fires at
**both** `verified` and `closed`. So (a)/(b) assert the *method* binding at `verified` (literal
"cannot reach verified" wording) **and** the *evidence* binding at `closed`. If Ethan wants
`verified` itself evidence-gated, that is a **core** change (affects web too) — flagged in §10 Q1,
**not** built unilaterally here.

---

## 6. Version & marketplace impact (new plugin ⇒ own version + 4-key sync)

`shipwithai-fixkit-backend` ships at **`0.1.0`**. The 4-key sync the gate enforces:
`plugin.json.version` == per-plugin `marketplace.json` top-level `version` == per-plugin
`marketplace.json` `plugins[0].version` == the matching entry in **root** `.claude-plugin/marketplace.json`.
All four = `0.1.0`. (Root `marketplace.json` top-level `version` is the *marketplace's own* version,
not gated against the plugin — confirmed in `run-all.js`: v4 = the root entry matching the plugin
name, not the root top-level.) The publish workflow triggers on a `plugins/**/.claude-plugin/plugin.json`
change **on `main`** — repo default is `master`, so no auto-publish fires from this branch (Q3,
informational).

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Cross-plugin `require()` of core's validator breaks if path/layout shifts | Resolve via repo-root anchor (`REPO/plugins/shipwithai-fixkit-core/lib/ledger-validator.js`); the gate fails loudly (not silently green) if the module is missing — Task 6 includes a presence assertion. |
| Negative tests pass for the wrong reason (guard not actually firing) | Each negative asserts the **specific rule code** AND pairs with a **control** that is ACCEPTED — a mutation that disables the guard flips the control or the negative. |
| "verified vs closed" semantic gap (Q1) | Documented in §5/§10; mechanized at the enforced chokepoint + method binding; no silent over-claim. |
| Scope creep into core | Zero core edits; adapter reuses guards read-only. Any core guard change is a separate, tests-first task gated on Ethan. |
| Skill linter failures (line/inline-code/desc/evals) | Every skill below is pre-budgeted < 200 lines, inline code ≤ 20, description < 200 chars, evals 5 with 3/2 split; Task 6 runs the gate to confirm. |
| Real-bug gate can't run yet (no target) | Adapter PR merges on the mechanized suite; real-bug closure is a tracked, deferred done-criterion (§9). |

---

## 8. Tasks (bite-sized, TDD, frequent commits)

> Conventional commits on `phase-2/backend-adapter`. Run the relevant gate after each fixture/gate
> change. Paths are repo-root-relative.

### Task 0: Branch + scaffold (after approval only)

- [ ] **Step 1 — branch.** Run:
```bash
cd /Users/ethannguyen/Data/WorkspaceSWA/shipwithai-fixkit
git checkout -b phase-2/backend-adapter
```
- [ ] **Step 2 — directories.** Run:
```bash
mkdir -p plugins/shipwithai-fixkit-backend/.claude-plugin \
  plugins/shipwithai-fixkit-backend/lib \
  plugins/shipwithai-fixkit-backend/skills/backend-environment/evals \
  plugins/shipwithai-fixkit-backend/skills/backend-reproduce/evals \
  plugins/shipwithai-fixkit-backend/skills/backend-verify/evals \
  plugins/shipwithai-fixkit-backend/skills/backend-source-map/evals \
  plugins/shipwithai-fixkit-backend/evals/fixtures/backend-stub-logic \
  plugins/shipwithai-fixkit-backend/evals/fixtures/backend-stub-integration \
  plugins/shipwithai-fixkit-backend/tests/lib
```
- [ ] **Step 3 — copy the shared parser verbatim** (identical, already-tested file; DRY):
```bash
cp plugins/shipwithai-fixkit-web/tests/lib/frontmatter.js \
   plugins/shipwithai-fixkit-backend/tests/lib/frontmatter.js
```
- [ ] **Step 4 — commit.** `git add -A && git commit -m "chore(phase-2): scaffold backend adapter tree"`

---

### Task 1: Capability declaration

**Files:** Create `plugins/shipwithai-fixkit-backend/lib/capability.json`

- [ ] **Step 1 — write the file:**
```json
{
  "UI": "NONE",
  "Logic": "FULL",
  "System": "FULL",
  "note": "FULL on a runnable backend stack. Logic FULL needs ~~test-runner (npm test / vitest / jest / pytest); System FULL needs the shell / ~~ci (pipeline) + ~~monitoring (boundary logs). UI = NONE: a UI-symptom bug is refused by this adapter and must be re-routed at triage to a UI-capable adapter (arch doc 09 §6)."
}
```
- [ ] **Step 2 — sanity check JSON:** `node -e "console.log(require('./plugins/shipwithai-fixkit-backend/lib/capability.json').System)"` → expect `FULL`.
- [ ] **Step 3 — commit.** `git commit -am "feat(phase-2): backend capability (Logic/System FULL, UI NONE)"`

---

### Task 2: `backend-stub-logic` fixture (TDD: red → green)

**Files (create all five):**

- [ ] **Step 1 — `evals/fixtures/backend-stub-logic/buggy.js`:**
```js
'use strict';
// Synthetic backend LOGIC bug (backend-stub-logic), ORIGINAL failing form.
// sumRange(n) must return 1+2+...+n. BUG: the loop sums 0..n-1 (wrong start AND end),
// so sumRange(5) yields 10 instead of 15. `reproduce.test.js` runs against THIS module
// and fails — that failing test IS the reproduction. The fix lives in `fixed.js`.
function sumRange(n) {
  let total = 0;
  for (let i = 0; i < n; i++) total += i;   // BUG: should be i = 1; i <= n
  return total;
}
module.exports = { sumRange };
```
- [ ] **Step 2 — `reproduce.test.js`:**
```js
'use strict';
// REPRODUCTION: a failing automated test (the Logic reproduce idiom, doc 09 §7).
// Runs the expected behaviour against BUGGY -> fails (exit non-zero). The failing run IS
// the reproduction; its method analog is `failing-test-passes` once it goes green.
const assert = require('assert');
const { sumRange } = require('./buggy');
const got = sumRange(5);
assert.strictEqual(got, 15, `REPRODUCED: sumRange(5) returned ${got} (expected 15)`);
console.log('unexpected: buggy sumRange already correct');
```
- [ ] **Step 3 — run it; expect FAIL:**
```bash
node plugins/shipwithai-fixkit-backend/evals/fixtures/backend-stub-logic/reproduce.test.js; echo "exit=$?"
```
Expected: an `AssertionError` and `exit=1` (the bug reproduces).
- [ ] **Step 4 — `fixed.js`:**
```js
'use strict';
// Fixed form of the backend-stub-logic bug: inclusive 1..n.
function sumRange(n) {
  let total = 0;
  for (let i = 1; i <= n; i++) total += i;
  return total;
}
module.exports = { sumRange };
```
- [ ] **Step 5 — `verify.test.js`:**
```js
'use strict';
// VERIFICATION mirrors reproduction: the SAME assertion, now against FIXED -> passes
// (exit zero). The passing run IS the `failing-test-passes` evidence. Extra edges pin it.
const assert = require('assert');
const { sumRange } = require('./fixed');
assert.strictEqual(sumRange(5), 15, `sumRange(5) = ${sumRange(5)}`);
assert.strictEqual(sumRange(1), 1, 'sumRange(1) = 1');
assert.strictEqual(sumRange(0), 0, 'sumRange(0) = 0');
console.log('backend-stub-logic verify: sumRange correct over 0,1,5 (failing test now passes)');
```
- [ ] **Step 6 — run it; expect PASS:**
```bash
node plugins/shipwithai-fixkit-backend/evals/fixtures/backend-stub-logic/verify.test.js; echo "exit=$?"
```
Expected: the verify line printed and `exit=0`.
- [ ] **Step 7 — `README.md`:**
```markdown
# backend-stub-logic — synthetic Logic fixture (test scaffolding, NOT a real target)

A deterministic off-by-one in `sumRange(n)` (should be `1+…+n`). It exercises the engine's
**Logic** loop without a real backend: `reproduce.test.js` fails against `buggy.js` (the failing
test IS the reproduction); `verify.test.js` passes against `fixed.js` (proof method
`failing-test-passes`). Verification mirrors reproduction — the same assertion, now green.
Run via `node <file>` exit code; wired into `tests/run-all.js` section 1.
```
- [ ] **Step 8 — commit.** `git commit -am "test(phase-2): backend-stub-logic fixture (reproduce red, verify green)"`

---

### Task 3: `backend-stub-integration` fixture (TDD: red → green)

**Files (create all five):**

- [ ] **Step 1 — `evals/fixtures/backend-stub-integration/buggy.js`:**
```js
'use strict';
// Synthetic backend INTEGRATION/System bug (backend-stub-integration), ORIGINAL failing form.
// A request crosses a service boundary; we instrument the boundary (the `log` array) BEFORE
// touching code -- the System reproduce idiom (doc 09 §7). BUG: the trailing slash is not
// normalized, so the boundary emits normalizedPath '/api/x/' instead of '/api/x'.
function handleAtBoundary(req, log) {
  const normalizedPath = req.path;                 // BUG: no trailing-slash normalization
  log.push({ method: req.method, normalizedPath, status: 200 });
  return { status: 200 };
}
module.exports = { handleAtBoundary };
```
- [ ] **Step 2 — `reproduce.test.js`:**
```js
'use strict';
// REPRODUCTION: instrument the boundary, then assert the boundary record is correct.
// Runs against BUGGY -> fails (exit non-zero). The failing boundary assertion IS the
// reproduction; its method analog is `instrumented-boundary`.
const assert = require('assert');
const { handleAtBoundary } = require('./buggy');
const log = [];
handleAtBoundary({ method: 'GET', path: '/api/x/' }, log);
const rec = log[0];
assert.strictEqual(rec.normalizedPath, '/api/x',
  `REPRODUCED: boundary logged normalizedPath='${rec.normalizedPath}' (expected '/api/x')`);
console.log('unexpected: buggy boundary already normalized');
```
- [ ] **Step 3 — run it; expect FAIL:**
```bash
node plugins/shipwithai-fixkit-backend/evals/fixtures/backend-stub-integration/reproduce.test.js; echo "exit=$?"
```
Expected: `AssertionError` (logged `'/api/x/'`) and `exit=1`.
- [ ] **Step 4 — `fixed.js`:**
```js
'use strict';
// Fixed form: the boundary normalizes trailing slash(es) before logging/dispatch.
function handleAtBoundary(req, log) {
  const normalizedPath = req.path.replace(/\/+$/, '') || '/';   // strip trailing slash(es)
  log.push({ method: req.method, normalizedPath, status: 200 });
  return { status: 200 };
}
module.exports = { handleAtBoundary };
```
- [ ] **Step 5 — `verify.test.js`:**
```js
'use strict';
// VERIFICATION mirrors reproduction: the SAME boundary-log assertion, now against FIXED ->
// passes (exit zero). The boundary record IS the `instrumented-boundary` evidence.
const assert = require('assert');
const { handleAtBoundary } = require('./fixed');
const log = [];
handleAtBoundary({ method: 'GET', path: '/api/x/' }, log);
const rec = log[0];
assert.strictEqual(rec.normalizedPath, '/api/x',
  `boundary normalizedPath='${rec.normalizedPath}' (status ${rec.status})`);
console.log('backend-stub-integration verify: boundary log correct (normalizedPath=/api/x)');
```
- [ ] **Step 6 — run it; expect PASS:**
```bash
node plugins/shipwithai-fixkit-backend/evals/fixtures/backend-stub-integration/verify.test.js; echo "exit=$?"
```
Expected: the verify line printed and `exit=0`.
- [ ] **Step 7 — `README.md`:**
```markdown
# backend-stub-integration — synthetic System/integration fixture (scaffolding, NOT real)

A deterministic boundary bug: a handler that fails to normalize a trailing slash, so the
**instrumented boundary log** records the wrong `normalizedPath`. It exercises the engine's
**System** loop without a real backend: `reproduce.test.js` instruments the boundary and fails
against `buggy.js`; `verify.test.js` re-runs the same boundary assertion against `fixed.js` and
passes (proof method `instrumented-boundary`). Wired into `tests/run-all.js` section 2.
```
- [ ] **Step 8 — commit.** `git commit -am "test(phase-2): backend-stub-integration fixture (boundary-log red->green)"`

---

### Task 4: The four recipe skills + evals

> Each skill: frontmatter `name`/`description`(<200)/`version`/`license`/`user-invocable`; ends with
> `## What this … does NOT do`; inline code ≤ 20 lines; < 200 lines; evals.json with ≥5 objects
> (≥3 `shouldTrigger:true`, ≥2 `false`), each `{id,prompt,expectedBehavior,category,shouldTrigger}`.

#### 4a. `skills/backend-environment/SKILL.md` (user-invocable)
```markdown
---
name: backend-environment
description: "Stand up or locate the runnable backend target and enforce hygiene: env vars present, ports free, clean test DB/state, kill stale processes. Triggers: 'start the service', 'reset the test DB'."
version: 0.1.0
license: MIT
user-invocable: true
---

# backend-environment — make the backend runnable and clean

The web adapter's sibling for backend stacks. The engine (core's spine) calls this to get a
**runnable, clean** target before REPRODUCE. It locates or stands up the service via `~~runtime`
and removes the state that makes backend bugs flaky. It ships no debugging logic.

## Locate or stand up the target (`~~runtime`)
Find the service entrypoint (`npm start` / `npm run dev`, a `docker compose` service, or an
in-process test harness) and the canonical port. Prefer the smallest runnable surface that still
reproduces the bug (an in-process handler over a full server when possible).

## Environment hygiene (the backend equivalent of cache discipline)
- **Env vars:** confirm required vars are present and pointed at a *test* target, never prod.
- **Ports:** ensure the canonical port is free; kill stale listeners before starting.
- **State:** start from a clean test DB / fixture state so a stale row can't fake a pass or fail.
- **Processes:** kill orphaned watchers/servers from a previous run.

```bash
# illustrative hygiene sweep (adapt per stack; ~~runtime supplies the concrete commands)
lsof -ti tcp:3000 | xargs -r kill        # free the canonical port
: "${DATABASE_URL:?set a TEST DATABASE_URL}"   # fail loudly if env is missing
```

## If ~~runtime Available
Stand up the live service on its canonical port. Without it, fall back to invoking the handler
in-process (the stub-fixture pattern) and note in the ledger that full-stack recipes need a runtime.

## What this skill does NOT do
- It does not reproduce, diagnose, fix, or verify — it only makes the target runnable and clean.
- It does not classify the bug (core's `triage`) or map symptom→file (see `backend-source-map`).
- It does not touch production state; it refuses to operate against a non-test target.
```

- [ ] **Step 1 — write the file above.**
- [ ] **Step 2 — `skills/backend-environment/evals/evals.json`:**
```json
{
  "evals": [
    { "id": "be-1", "prompt": "Start the backend service so I can reproduce the 500 on /orders.", "expectedBehavior": "Locates/stands up the runnable target on its canonical port.", "category": "environment", "shouldTrigger": true },
    { "id": "be-2", "prompt": "The test database has stale rows from the last run; reset it.", "expectedBehavior": "Applies state hygiene: clean test DB before reproduce.", "category": "environment", "shouldTrigger": true },
    { "id": "be-3", "prompt": "Kill the stale node process holding the API port.", "expectedBehavior": "Frees the canonical port / kills orphaned listeners.", "category": "environment", "shouldTrigger": true },
    { "id": "be-4", "prompt": "Change the hero button color on the marketing page.", "expectedBehavior": "Does not trigger — a UI task, not backend environment.", "category": "off-domain", "shouldTrigger": false },
    { "id": "be-5", "prompt": "Write the failing unit test that captures the wrong total.", "expectedBehavior": "Does not trigger — that is backend-reproduce, not environment.", "category": "wrong-step", "shouldTrigger": false }
  ]
}
```

#### 4b. `skills/backend-reproduce/SKILL.md` (sub-skill)
```markdown
---
name: backend-reproduce
description: "Backend reproduce recipes per layer: Logic = a failing automated test written first; System = reproduce in the failing env and instrument the boundaries. UI is refused. Internal: engine reproduce step."
version: 0.1.0
license: MIT
user-invocable: false
---

# backend-reproduce — trigger the failure on a runnable backend

The backend adapter's reproduce recipes. The engine (core's spine, REPRODUCE phase) calls these to
trigger a backend failure **reliably** on the target from `backend-environment`. Pick the recipe by
the triaged symptom layer. This adapter covers **Logic** and **System** only.

## Logic — a failing automated test (write it first)
Author the smallest test that asserts the intended behaviour; run it against the current code so it
**fails on the bug**. The failing run IS the reproduction (method analog: `failing-test-passes`
once green). Use `~~test-runner` (`npm test` / vitest / jest / pytest / `node <file>`).

```js
// illustrative: assert the intended output; this FAILS on the bug
const assert = require('assert');
const { compute } = require('../src/compute');
assert.strictEqual(compute(5), 15); // reproduced when this throws
```

## System — reproduce in the failing env + instrument the boundaries
Reproduce in the env that fails, then **log at the seam before touching code**: the request/response
edge, the queue, the DB call. The wrong value appearing in the boundary log IS the reproduction
(method analog: `instrumented-boundary`).

```js
// illustrative: capture the boundary record, then assert it
const log = [];
handleAtBoundary({ method: 'GET', path: '/api/x/' }, log);
console.log(log[0]); // reproduced when log[0] disagrees with intent
```

## UI — refused (capability NONE)
This adapter declares **UI = NONE** (`lib/capability.json`). A UI-symptom bug is **not accepted**
here; return to triage so the orchestrator re-routes it to a UI-capable adapter (doc 09 §6).

## What this skill does NOT do
- It does not diagnose or fix — it only triggers and records the failure (core's spine does the rest).
- It does not pick which proof counts at close (core's `verification`) or stand up the env.
- It does not handle UI bugs; UI is refused and re-routed at triage.
```

- [ ] **Step 3 — write the file above.**
- [ ] **Step 4 — `skills/backend-reproduce/evals/evals.json`:**
```json
{
  "evals": [
    { "id": "br-1", "prompt": "Reproduce the 500 on the /orders endpoint before we touch anything.", "expectedBehavior": "Reproduces in the failing env and instruments the boundary.", "category": "system", "shouldTrigger": true },
    { "id": "br-2", "prompt": "Write a failing test that captures the wrong order total.", "expectedBehavior": "Authors a failing Logic test first (reproduce-by-test).", "category": "logic", "shouldTrigger": true },
    { "id": "br-3", "prompt": "Instrument the DB boundary to show the bad query result.", "expectedBehavior": "Logs at the data-layer seam before changing code.", "category": "system", "shouldTrigger": true },
    { "id": "br-4", "prompt": "Explain conceptually what an off-by-one error is.", "expectedBehavior": "Does not trigger — no concrete bug to reproduce.", "category": "conceptual", "shouldTrigger": false },
    { "id": "br-5", "prompt": "The CSS grid is misaligned on mobile; reproduce it.", "expectedBehavior": "Does not trigger — UI symptom, refused (re-route at triage).", "category": "ui-refused", "shouldTrigger": false }
  ]
}
```

#### 4c. `skills/backend-verify/SKILL.md` (sub-skill)
```markdown
---
name: backend-verify
description: "Backend verify recipes that mirror reproduce: Logic = the failing test passes + full suite green; System = the instrumented boundary logs correct + pipeline green. Never closes on a diff. Internal: engine verify step."
version: 0.1.0
license: MIT
user-invocable: false
---

# backend-verify — prove the fix by re-running the reproduction

The backend adapter's verify recipes. **Verification mirrors reproduction:** each recipe re-runs the
*same observation* `backend-reproduce` used to trigger the failure — same test, same boundary — now
asserting the fixed result. A bug reproduced by a failing test is verified by that test passing;
a boundary bug is verified by the boundary log, **never by a source diff** (core enforces
`VERIFICATION_LAYER_MISMATCH`).

Proof methods MUST match the layer's `LAYER_METHODS`: Logic = `test-run` / `failing-test-passes` /
`unit-test`; System = `instrumented-boundary` / `pipeline-run` / `ci-run` / `integration-test`.

## Logic — the failing test passes + suite green (mirrors reproduce-by-test)
Re-run the previously-failing test; assert it now passes, then run the **full suite** to catch
regressions. Record the suite result as `verification.evidence`. Method: `failing-test-passes`.

```bash
npm test            # the previously-failing test now passes; whole suite green
```

## System — boundary logs correct + pipeline green (mirrors instrumented boundary)
Re-run the instrumented boundary; assert the record now carries the correct value, and the pipeline
(`~~ci`) is green. Record the boundary log line as `verification.evidence`. Method:
`instrumented-boundary` (or `pipeline-run` / `ci-run`).

```js
const log = [];
handleAtBoundary({ method: 'GET', path: '/api/x/' }, log);
console.assert(log[0].normalizedPath === '/api/x', 'boundary fixed');
```

## UI — refused (capability NONE)
This adapter does not verify UI bugs (UI = NONE). It never emits a UI proof; UI bugs are re-routed
at triage to a UI-capable adapter.

## What this skill does NOT do
- It does not fix the bug or run the proof itself — the layer-agent does; this names the proof.
- It does not close the ledger (core's integrity rule does) and never closes on a source diff.
- It does not invent a proof method outside the layer's `LAYER_METHODS`, and does not verify UI.
```

- [ ] **Step 5 — write the file above.**
- [ ] **Step 6 — `skills/backend-verify/evals/evals.json`:**
```json
{
  "evals": [
    { "id": "bv-1", "prompt": "Confirm the previously-failing test now passes and the suite is green.", "expectedBehavior": "Runs the Logic proof (failing-test-passes + suite green).", "category": "logic", "shouldTrigger": true },
    { "id": "bv-2", "prompt": "Verify the boundary log now shows the corrected normalized path.", "expectedBehavior": "Re-runs the instrumented boundary and asserts the record.", "category": "system", "shouldTrigger": true },
    { "id": "bv-3", "prompt": "Prove the integration bug is fixed before we close it.", "expectedBehavior": "Mirrors reproduction with boundary/pipeline proof, not a diff.", "category": "system", "shouldTrigger": true },
    { "id": "bv-4", "prompt": "Verify the rendered page has no horizontal overflow.", "expectedBehavior": "Does not trigger — UI computed-style proof, not this adapter.", "category": "ui-refused", "shouldTrigger": false },
    { "id": "bv-5", "prompt": "Draft the CHANGELOG entry for this release.", "expectedBehavior": "Does not trigger — documentation, not verification.", "category": "off-domain", "shouldTrigger": false }
  ]
}
```

#### 4d. `skills/backend-source-map/SKILL.md` (sub-skill)
```markdown
---
name: backend-source-map
description: "Symptom -> file hints on common backend stacks: route/handler -> service/use-case -> data layer. Generic only; org specifics belong to packs. Internal: engine isolate step on a backend bug."
version: 0.1.0
license: MIT
user-invocable: false
---

# backend-source-map — map a backend symptom to likely source files

The backend adapter's source-map hints. The engine (core's spine, ISOLATE phase) uses these to
narrow a backend symptom to the files most likely at fault, at a **generic** level — org- or
framework-specific maps live in packs, not here.

## The generic backend request path
Most backend bugs sit on one of three rungs of the request path. Walk them outermost-in:

1. **Route / handler / controller** — request parsing, status codes, auth, input validation.
   Symptoms: wrong status, 4xx/5xx at the edge, request not reaching the service.
2. **Service / use-case / domain logic** — the computation, state transitions, business rules.
   Symptoms: wrong output, bad totals, incorrect state — usually a **Logic** bug.
3. **Data layer / repository / client** — queries, ORM mappings, external API/DB calls, queues.
   Symptoms: wrong/missing rows, serialization, integration edges — usually a **System** bug.

## Symptom → rung hints
- Wrong computed value / total / edge case → **service** (rung 2), Logic.
- 500 / timeout / wrong payload at an integration edge → **data layer** (rung 3), System.
- Wrong status / missing field at the request edge → **handler** (rung 1).
- Instrument the boundary between two rungs to localize which one emits the wrong value first.

## What this skill does NOT do
- It does not reproduce, fix, or verify — it only suggests where to look.
- It does not encode org- or framework-specific file layouts; those belong to a pack overlay.
- It does not map UI symptoms (UI = NONE for this adapter).
```

- [ ] **Step 7 — write the file above.**
- [ ] **Step 8 — `skills/backend-source-map/evals/evals.json`:**
```json
{
  "evals": [
    { "id": "bs-1", "prompt": "Where does the /orders 500 most likely originate in the code?", "expectedBehavior": "Points to the data-layer/integration rung for a 500 edge.", "category": "system", "shouldTrigger": true },
    { "id": "bs-2", "prompt": "Map this wrong-balance symptom to the right layer.", "expectedBehavior": "Points to the service/domain rung for a wrong computed value.", "category": "logic", "shouldTrigger": true },
    { "id": "bs-3", "prompt": "Which file handles the /api/checkout route?", "expectedBehavior": "Points to the route/handler rung.", "category": "handler", "shouldTrigger": true },
    { "id": "bs-4", "prompt": "Which Astro component renders the hero section?", "expectedBehavior": "Does not trigger — web stack, wrong adapter.", "category": "off-domain", "shouldTrigger": false },
    { "id": "bs-5", "prompt": "Run the production deploy pipeline now.", "expectedBehavior": "Does not trigger — deployment, not source mapping.", "category": "off-domain", "shouldTrigger": false }
  ]
}
```

- [ ] **Step 9 — verify each SKILL.md < 200 lines & ends correctly:**
```bash
for f in plugins/shipwithai-fixkit-backend/skills/*/SKILL.md; do echo "$f: $(wc -l < "$f") lines"; done
```
Expected: all comfortably < 200.
- [ ] **Step 10 — validate every evals.json parses:**
```bash
for f in plugins/shipwithai-fixkit-backend/skills/*/evals/evals.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('ok $f')"; done
```
- [ ] **Step 11 — commit.** `git commit -am "feat(phase-2): backend recipe skills (environment/reproduce/verify/source-map) + evals"`

---

### Task 5: Connectors, plugin manifests, marketplace sync, docs

- [ ] **Step 1 — `CONNECTORS.md`:**
```markdown
# Connectors — backend adapter mappings

Core references capabilities by `~~category` placeholder (see core `CONNECTORS.md`). This adapter
maps each placeholder to a concrete **backend tool** with alternatives. The `## If <connector>
Available` idiom lets a recipe upgrade when the connector is present and degrade gracefully when
it is absent.

| Placeholder | Backend tool (primary) | Alternatives |
|---|---|---|
| `~~test-runner` | `npm test` | `vitest`, `jest`, `pytest`, raw `node <file>` exit code |
| `~~ci` | GitHub Actions | local shell build/run |
| `~~monitoring` | structured stdout/stderr boundary logs | Sentry-class MCP, log files |
| `~~runtime` | local service / dev server | container, in-process handler harness |
| `~~source control` | git + GitHub | local `git` |

## If ~~test-runner Available
Run the Logic proof via `npm test` (or vitest/jest/pytest, or `node <file>` like the stub fixtures).
The previously-failing test passing + the full suite green is what makes **Logic FULL**.

## If ~~ci Available
Run / read the System proof through the pipeline (GitHub Actions): a green pipeline is part of the
System proof. Without it, fall back to a local shell build/run plus instrumented-boundary logs.

## If ~~monitoring Available
Read structured logs / traces to confirm the instrumented boundary now carries the correct value
(`instrumented-boundary` evidence). Without a monitoring MCP, fall back to stdout/stderr log lines.

## If ~~runtime Available
Stand up the live service on its canonical port (see `backend-environment`). Without it, invoke the
handler in-process (the stub-fixture pattern) and note that full-stack recipes need a live runtime.

## If ~~source control Available
Use git + GitHub for diffs and history. A bug is **never** closed on a source diff alone — the diff
locates the change; the test/boundary proof confirms it.

## UI is refused
This adapter declares **UI = NONE** (`lib/capability.json`). It maps no `~~browser` connector; a
UI-symptom bug is re-routed at triage to a UI-capable adapter (doc 09 §6).

## What this does NOT do
- It does not bind any MCP server in code — the host wires the concrete connector; this file declares
  the mapping only.
- It does not grant a capability tier on its own; `lib/capability.json` declares the tiers.
- It does not re-implement the ledger, the verification matrix, or any guard — those are core's.
```

- [ ] **Step 2 — `.claude-plugin/plugin.json`:**
```json
{
  "name": "shipwithai-fixkit-backend",
  "description": "Thin backend adapter for the fixkit engine: maps the ~~connector placeholders to concrete backend tooling (npm/vitest/jest/pytest test runners, CI pipelines, log/monitoring boundaries) and ships per-layer reproduce/verify/source-map recipes for runnable server stacks. Logic/System = FULL, UI = NONE. No debugging logic — that lives in core.",
  "version": "0.1.0",
  "author": {
    "name": "ShipWithAI",
    "url": "https://shipwithai.io"
  },
  "homepage": "https://shipwithai.io/plugins/fixkit-backend",
  "repository": "https://github.com/shipwithai/shipwithai-fixkit",
  "license": "MIT",
  "keywords": ["bug-fix", "backend", "adapter", "logic", "system", "integration", "reproduce", "verify", "source-map"],
  "skills": [
    "./skills/backend-environment",
    "./skills/backend-reproduce",
    "./skills/backend-verify",
    "./skills/backend-source-map"
  ]
}
```

- [ ] **Step 3 — `.claude-plugin/marketplace.json`:**
```json
{
  "$schema": "https://anthropic.com/claude-code/marketplace.schema.json",
  "name": "shipwithai-fixkit-backend",
  "description": "Thin backend adapter for the fixkit engine. Maps ~~connectors to concrete backend tooling and ships per-layer reproduce/verify/source-map recipes. Logic/System = FULL, UI = NONE.",
  "owner": {
    "name": "ShipWithAI",
    "email": "support@shipwithai.com"
  },
  "plugins": [
    {
      "name": "shipwithai-fixkit-backend",
      "description": "Thin backend adapter: connector mappings + per-layer recipes + capability declarations for runnable server stacks (Logic/System FULL, UI NONE). No debugging logic — that lives in core.",
      "version": "0.1.0",
      "author": {
        "name": "ShipWithAI",
        "email": "support@shipwithai.com"
      },
      "source": "./",
      "category": "productivity",
      "tags": ["bug-fix", "backend", "adapter", "logic", "system", "integration"]
    }
  ],
  "version": "0.1.0"
}
```

- [ ] **Step 4 — `manifest.json`:**
```json
{
  "lastUpdated": 1749000000000,
  "skills": [
    {
      "skillId": "backend-environment",
      "name": "backend-environment",
      "description": "Stand up or locate the runnable backend target and enforce hygiene: env vars, free ports, clean test DB/state, kill stale processes. Triggers: 'start the service', 'reset the test DB'.",
      "creatorType": "community",
      "updatedAt": "2026-06-04T00:00:00Z",
      "enabled": true
    },
    {
      "skillId": "backend-reproduce",
      "name": "backend-reproduce",
      "description": "Backend reproduce recipes: Logic = a failing automated test written first; System = reproduce in the failing env and instrument the boundaries. UI refused. Internal: engine reproduce step.",
      "creatorType": "community",
      "updatedAt": "2026-06-04T00:00:00Z",
      "enabled": true
    },
    {
      "skillId": "backend-verify",
      "name": "backend-verify",
      "description": "Backend verify recipes mirroring reproduce: Logic = failing test passes + suite green; System = boundary logs correct + pipeline green. Never closes on a diff. Internal: engine verify step.",
      "creatorType": "community",
      "updatedAt": "2026-06-04T00:00:00Z",
      "enabled": true
    },
    {
      "skillId": "backend-source-map",
      "name": "backend-source-map",
      "description": "Symptom -> file hints on backend stacks: route/handler -> service -> data layer. Generic only; org specifics belong to packs. Internal: engine isolate step on a backend bug.",
      "creatorType": "community",
      "updatedAt": "2026-06-04T00:00:00Z",
      "enabled": true
    }
  ]
}
```

- [ ] **Step 5 — append the backend entry to root `.claude-plugin/marketplace.json`** `plugins` array
  (after the `shipwithai-fixkit-web` object), preserving the existing two entries:
```json
    {
      "name": "shipwithai-fixkit-backend",
      "description": "Thin backend adapter for the fixkit engine: maps ~~connectors to concrete backend tooling (npm/vitest/jest/pytest, CI pipelines, log/monitoring boundaries) and ships per-layer reproduce/verify/source-map recipes for runnable server stacks. Logic/System = FULL, UI = NONE. No debugging logic — that lives in core.",
      "version": "0.1.0",
      "author": {
        "name": "ShipWithAI",
        "email": "support@shipwithai.com"
      },
      "source": "./plugins/shipwithai-fixkit-backend",
      "category": "productivity",
      "tags": ["bug-fix", "backend", "adapter", "logic", "system", "integration"]
    }
```
- [ ] **Step 6 — `README.md`:**
```markdown
# shipwithai-fixkit-backend

The **thin backend adapter** for the `shipwithai-fixkit-core` engine. It teaches the engine how to
reproduce, verify, and locate bugs on a runnable backend stack without re-implementing any of the
engine itself.

## What it provides
- **Connector mappings** (`CONNECTORS.md`): `~~test-runner` → npm/vitest/jest/pytest, `~~ci` →
  GitHub Actions, `~~monitoring` → structured boundary logs (alt: Sentry-class MCP), `~~runtime` →
  local service / in-process harness, `~~source control` → git/GitHub.
- **Capability declaration** (`lib/capability.json`): **Logic / System = FULL, UI = NONE**.
- **Four recipe skills:** `backend-environment` (user-invocable; stand up/clean the target),
  `backend-reproduce`, `backend-verify`, `backend-source-map` (sub-skills).

## Capability + UI refusal
Logic FULL needs `~~test-runner`; System FULL needs the shell/`~~ci` + `~~monitoring`. **UI = NONE**:
a UI-symptom bug is refused and re-routed at triage to a UI-capable adapter (doc 09 §6).

## Mirror principle
Verification mirrors reproduction: a Logic bug reproduced by a failing test is verified by that test
passing; a System bug reproduced by a boundary log is verified by that boundary log — never a diff.

## Develop
`node tests/run-all.js` (from the repo root) runs this plugin's blocking gate: both stub-fixture
lifecycles, the capability declaration, the negative tests (via core's validator), the convention
linters, and the 4-key version sync. Exit 0 = green.

## Scope
A Phase-2 adapter. It maps connectors and ships recipes; it ships **no** debugging logic,
layer-agents, or orchestration (those are core). The `evals/fixtures/backend-stub-*` are synthetic
test scaffolding, not real targets.

## License
MIT.
```

- [ ] **Step 7 — `CHANGELOG.md` (plugin-local):**
```markdown
# Changelog — shipwithai-fixkit-backend

## 0.1.0
- Initial thin backend adapter: `CONNECTORS.md` (~~test-runner/~~ci/~~monitoring/~~runtime/
  ~~source control), `lib/capability.json` (Logic/System = FULL, UI = NONE), four recipe skills
  (backend-environment/reproduce/verify/source-map), two stub fixtures (logic + integration), and a
  blocking `tests/run-all.js` (stub lifecycles + capability + negative tests + linters + version sync).
```

- [ ] **Step 8 — append to root `CHANGELOG.md`** a `shipwithai-fixkit-backend 0.1.0` line under a
  Phase-2 heading (match the existing root CHANGELOG style; read it first per ADR-0003).
- [ ] **Step 9 — `CLAUDE.md` (plugin-local):**
```markdown
# CLAUDE.md — shipwithai-fixkit-backend

Runtime guidance for working inside the **backend adapter**. Conforms to the fixkit family
conventions (ADR-0001). The engine it adapts is `shipwithai-fixkit-core`.

## What an adapter is (design-doc 09 §9)
An adapter is **thin**: mappings, recipes, declarations only. The debugging discipline, layer-agents,
ledger state machine, and orchestrator all live in **core**. This plugin never re-implements them.

## What this adapter supplies
- **Connector mappings** (`CONNECTORS.md`): each core `~~category` → a concrete backend tool.
- **Capability declaration** (`lib/capability.json`): Logic / System = FULL; **UI = NONE**.
- **Per-layer recipes** (skills): `backend-environment`, `backend-reproduce`, `backend-verify`,
  `backend-source-map`.

## Capability + UI refusal
Logic FULL needs `~~test-runner`; System FULL needs the shell/`~~ci` + `~~monitoring`. UI = NONE — a
UI-symptom bug is refused and re-routed at triage (doc 09 §6). This adapter never emits a UI proof.

## Mirror principle
Verification mirrors reproduction: Logic verifies by the failing test passing + suite green; System
verifies by the instrumented boundary logging correct + pipeline green. Never close on a diff (core
enforces `VERIFICATION_LAYER_MISMATCH`).

## Run the gate
`node tests/run-all.js` (from the repo root). Exit 0 = green. The gate reuses core's
`lib/ledger-validator.js` for its negative tests (the single source of truth for bug state).

## What this plugin does NOT do
- It ships **no** debugging logic, layer-agents, or orchestration — those are core's.
- It does not re-implement the ledger, the verification matrix, or any guard; it references them.
- It does not bind any MCP server in code; `CONNECTORS.md` declares the mappings, the host wires them.
- It does not accept UI bugs (UI = NONE); they are refused and re-routed at triage.
```

- [ ] **Step 10 — validate all JSON parses** (plugin.json, both marketplaces, manifest):
```bash
for f in plugins/shipwithai-fixkit-backend/.claude-plugin/plugin.json plugins/shipwithai-fixkit-backend/.claude-plugin/marketplace.json plugins/shipwithai-fixkit-backend/manifest.json .claude-plugin/marketplace.json; do node -e "JSON.parse(require('fs').readFileSync('$f','utf8')); console.log('ok $f')"; done
```
- [ ] **Step 11 — commit.** `git commit -am "feat(phase-2): backend connectors, manifests, marketplace sync, docs"`

---

### Task 6: The backend gate (`tests/run-all.js`)

**Files:** Create `plugins/shipwithai-fixkit-backend/tests/run-all.js`

- [ ] **Step 1 — write the gate.** Six sections; reuses core's validator for negatives.
```js
'use strict';
// shipwithai-fixkit-backend — the deterministic blocking gate for the backend adapter.
// Run from the repo root:  node plugins/shipwithai-fixkit-backend/tests/run-all.js
// Exit 0 = green (gate passes). Any failure exits non-zero (BLOCKING).
//
// Sections:
//   1. backend-stub-logic lifecycle        (reproduce FAILS on buggy, verify PASSES on fixed)
//   2. backend-stub-integration lifecycle  (boundary-log reproduce FAILS -> verify PASSES)
//   3. capability declaration              (Logic/System = FULL, UI = NONE)
//   4. negative tests via core validator   (Logic/System proof binding + evidence; UI refusal)
//   5. convention + eval-schema linters    (>=4 skills; <200; "does NOT do"; <=20; desc<200; subskill; evals)
//   6. 4-key version sync                   (plugin.json == mkt top == plugins[0] == root entry)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseFrontmatter } = require('./lib/frontmatter');

const ROOT = path.join(__dirname, '..');                 // plugin root
const REPO = path.join(ROOT, '..', '..');                // repo root
const SKILLS_DIR = path.join(ROOT, 'skills');
const CORE_VALIDATOR = path.join(REPO, 'plugins', 'shipwithai-fixkit-core', 'lib', 'ledger-validator.js');

let pass = 0;
const failures = [];
function ok(name) { pass++; console.log(`  ✓ ${name}`); }
function fail(name, detail) { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
function assert(cond, name, detail) { cond ? ok(name) : fail(name, detail); }
function section(t) { console.log(`\n${t}`); }
function hasCode(res, code) { return res.violations.some((x) => x.code === code); }
function runLifecycle(dir, label) {
  let reproduced = false;
  try { execFileSync(process.execPath, [path.join(dir, 'reproduce.test.js')], { stdio: 'pipe' }); }
  catch (e) { reproduced = true; }
  assert(reproduced, `${label}: reproduce.test.js FAILS against buggy.js (bug reproduced)`);
  let verified = false;
  try { execFileSync(process.execPath, [path.join(dir, 'verify.test.js')], { stdio: 'pipe' }); verified = true; }
  catch (e) { verified = false; }
  assert(verified, `${label}: verify.test.js PASSES against fixed.js (fix verified)`);
}

// 1 + 2. STUB LIFECYCLES ----------------------------------------------------
section('1. backend-stub-logic lifecycle (failing test -> passes)');
runLifecycle(path.join(ROOT, 'evals', 'fixtures', 'backend-stub-logic'), 'logic');
section('2. backend-stub-integration lifecycle (boundary-log reproduce -> verify)');
runLifecycle(path.join(ROOT, 'evals', 'fixtures', 'backend-stub-integration'), 'integration');

// 3. CAPABILITY DECLARATION -------------------------------------------------
section('3. capability declaration (lib/capability.json)');
let cap = null;
try { cap = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'capability.json'), 'utf8')); }
catch (e) { fail('lib/capability.json valid JSON', e.message); }
if (cap) {
  assert(cap.Logic === 'FULL' && cap.System === 'FULL' && cap.UI === 'NONE',
    'capability.json declares Logic/System = FULL, UI = NONE', `UI=${cap.UI} Logic=${cap.Logic} System=${cap.System}`);
}

// 4. NEGATIVE TESTS (reuse core's real validator — single source of truth) ---
section('4. negative tests (Logic/System proof binding + UI refusal)');
assert(fs.existsSync(CORE_VALIDATOR), 'core ledger-validator.js resolvable from the backend gate', CORE_VALIDATOR);
if (fs.existsSync(CORE_VALIDATOR)) {
  const { validateLedger } = require(CORE_VALIDATOR);
  const ver = (m, ev) => ({ method: m, capability_tier: 'FULL', evidence: ev, verified_by: 'agent' });
  // (a) Logic cannot be verified by a non-Logic proof; cannot close without evidence.
  const a1 = validateLedger({ state: 'verified', symptom_layer: 'Logic', root_cause: 'rc', fix: 'f', verification: ver('instrumented-boundary', 'x') });
  assert(!a1.ok && hasCode(a1, 'VERIFICATION_LAYER_MISMATCH'), '(a) Logic@verified by a boundary method is REJECTED', JSON.stringify(a1.violations));
  const a2 = validateLedger({ state: 'closed', symptom_layer: 'Logic', root_cause: 'rc', fix: 'f', verification: ver('failing-test-passes', '') });
  assert(!a2.ok && hasCode(a2, 'INTEGRITY_EVIDENCE_EMPTY'), '(a) Logic@closed without recorded test evidence is REJECTED', JSON.stringify(a2.violations));
  const a3 = validateLedger({ state: 'closed', symptom_layer: 'Logic', root_cause: 'rc', fix: 'f', verification: ver('failing-test-passes', 'suite green; failing test now passes') });
  assert(a3.ok, '(a) control: Logic@closed with failing-test-passes + evidence is ACCEPTED', JSON.stringify(a3.violations));
  // (b) System cannot be verified by a Logic proof; cannot close without boundary evidence.
  const b1 = validateLedger({ state: 'verified', symptom_layer: 'System', root_cause: 'rc', fix: 'f', verification: ver('failing-test-passes', 'x') });
  assert(!b1.ok && hasCode(b1, 'VERIFICATION_LAYER_MISMATCH'), '(b) System@verified by a unit-test method is REJECTED', JSON.stringify(b1.violations));
  const b2 = validateLedger({ state: 'closed', symptom_layer: 'System', root_cause: 'rc', fix: 'f', verification: ver('instrumented-boundary', '') });
  assert(!b2.ok && hasCode(b2, 'INTEGRITY_EVIDENCE_EMPTY'), '(b) System@closed without boundary-log evidence is REJECTED', JSON.stringify(b2.violations));
  const b3 = validateLedger({ state: 'closed', symptom_layer: 'System', root_cause: 'rc', fix: 'f', verification: ver('instrumented-boundary', 'boundary: normalizedPath=/api/x status=200') });
  assert(b3.ok, '(b) control: System@closed with instrumented-boundary + evidence is ACCEPTED', JSON.stringify(b3.violations));
}
// (c) UI is refused by this adapter (capability NONE).
if (cap) {
  const accepts = (layer) => cap[layer] !== 'NONE';
  assert(cap.UI === 'NONE' && accepts('UI') === false, '(c) UI-symptom bug is REFUSED by this adapter (capability NONE)');
  assert(accepts('Logic') === true && accepts('System') === true, '(c) control: Logic + System are accepted (FULL)');
}

// 5. CONVENTION + EVAL-SCHEMA LINTERS (BLOCKING) ----------------------------
section('5. Convention + eval-schema linters');
function walkSkillFiles() {
  const out = [];
  if (!fs.existsSync(SKILLS_DIR)) return out;
  for (const s of fs.readdirSync(SKILLS_DIR)) {
    const skillMd = path.join(SKILLS_DIR, s, 'SKILL.md');
    if (fs.existsSync(skillMd)) out.push({ skill: s, file: skillMd });
  }
  return out;
}
function lastH2(text) { const m = text.match(/^##[^#].*$/gm); return m ? m[m.length - 1] : null; }
function maxFencedBlock(text) {
  const lines = text.split(/\r?\n/);
  let inBlock = false, len = 0, max = 0;
  for (const ln of lines) {
    if (/^\s*```/.test(ln)) { if (inBlock) { max = Math.max(max, len); inBlock = false; len = 0; } else { inBlock = true; len = 0; } }
    else if (inBlock) { len++; }
  }
  return max;
}
const skills = walkSkillFiles();
assert(skills.length >= 4, 'at least 4 skills present', String(skills.length));
let subSkillCount = 0;
for (const { skill, file } of skills) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/).length;
  const h2 = lastH2(text);
  assert(h2 && /what this .*does not do/i.test(h2), `${skill}/SKILL.md ends with "## What this ... does NOT do"`, h2 || 'none');
  assert(lines < 200, `${skill}/SKILL.md < 200 lines`, String(lines));
  const blk = maxFencedBlock(text);
  assert(blk <= 20, `${skill}/SKILL.md inline-code <= 20 lines`, `max block ${blk}`);
  const fm = parseFrontmatter(text);
  assert(typeof fm.description === 'string' && fm.description.length < 200, `${skill}/SKILL.md description < 200 chars`, `${(fm.description || '').length}`);
  if (fm['user-invocable'] === false) subSkillCount++;
}
assert(subSkillCount >= 1, 'at least 1 skill is a user-invocable:false sub-skill', String(subSkillCount));
for (const { skill } of skills) {
  const ej = path.join(SKILLS_DIR, skill, 'evals', 'evals.json');
  if (!fs.existsSync(ej)) { fail(`${skill} has evals/evals.json`); continue; }
  let data;
  try { data = JSON.parse(fs.readFileSync(ej, 'utf8')); } catch (e) { fail(`${skill} evals.json valid JSON`, e.message); continue; }
  const evals = Array.isArray(data.evals) ? data.evals : [];
  assert(evals.length >= 5, `${skill} evals: >= 5 prompts`, String(evals.length));
  const shaped = evals.every((e) => e && e.id && e.prompt && e.expectedBehavior && e.category && typeof e.shouldTrigger === 'boolean');
  assert(shaped, `${skill} evals: every object has {id,prompt,expectedBehavior,category,shouldTrigger}`);
  const trig = evals.filter((e) => e.shouldTrigger === true).length;
  const must = evals.filter((e) => e.shouldTrigger === false).length;
  assert(trig >= 3 && must >= 2, `${skill} evals: >=3 trigger / >=2 must-not-trigger`, `trigger=${trig} must-not=${must}`);
}

// 6. 4-KEY VERSION SYNC -----------------------------------------------------
section('6. 4-key version sync (this plugin)');
{
  const pj = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
  const pm = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'));
  const rootMktPath = path.join(REPO, '.claude-plugin', 'marketplace.json');
  const v1 = pj.version;
  const v2 = pm.version;
  const v3 = (pm.plugins && pm.plugins[0] && pm.plugins[0].version);
  let v4 = 'MISSING';
  if (fs.existsSync(rootMktPath)) {
    const rm = JSON.parse(fs.readFileSync(rootMktPath, 'utf8'));
    const match = (rm.plugins || []).find((p) => p.name === pj.name);
    v4 = match ? match.version : 'NOT_FOUND';
  }
  assert(v1 && v1 === v2 && v1 === v3 && v1 === v4,
    '4-key version sync (plugin.json == per-plugin top == per-plugin plugins[0] == root)',
    `plugin=${v1} mkt-top=${v2} mkt-plugins0=${v3} root=${v4}`);
}

// SUMMARY -------------------------------------------------------------------
console.log(`\n${'='.repeat(60)}`);
if (failures.length === 0) {
  console.log(`PASS — ${pass} checks green. Backend-adapter gate satisfied.`);
  process.exit(0);
} else {
  console.log(`FAIL — ${failures.length} failing, ${pass} passing:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
```
- [ ] **Step 2 — run the backend gate; expect exit 0:**
```bash
node plugins/shipwithai-fixkit-backend/tests/run-all.js; echo "exit=$?"
```
Expected: `PASS — N checks green. Backend-adapter gate satisfied.` and `exit=0`.
- [ ] **Step 3 — mutation check (prove the negatives bite).** Temporarily flip `cap.UI` to `"FULL"`
  in `lib/capability.json` and re-run: the gate MUST fail on section 3 + the (c) refusal check.
  Revert immediately. (Do not commit the mutation.)
```bash
node -e "const f='plugins/shipwithai-fixkit-backend/lib/capability.json',j=require('fs');const o=JSON.parse(j.readFileSync(f));o.UI='FULL';j.writeFileSync(f,JSON.stringify(o,null,2))"
node plugins/shipwithai-fixkit-backend/tests/run-all.js; echo "exit=$? (expect non-zero)"
git checkout -- plugins/shipwithai-fixkit-backend/lib/capability.json
```
- [ ] **Step 4 — commit.** `git commit -am "test(phase-2): backend blocking gate (lifecycles + negatives + linters + sync)"`

---

### Task 7: Regression — the other two gates stay green

- [ ] **Step 1 — core gate:**
```bash
( cd plugins/shipwithai-fixkit-core && node tests/run-all.js ); echo "core exit=$?"
```
Expected: `Phase-0 gate satisfied`, exit 0 (unchanged — we touched nothing in core).
- [ ] **Step 2 — web gate:**
```bash
node plugins/shipwithai-fixkit-web/tests/run-all.js; echo "web exit=$?"
```
Expected: web gate satisfied, exit 0.
- [ ] **Step 3 — confirm the root marketplace still lists all three plugins with synced versions:**
```bash
node -e "const m=require('./.claude-plugin/marketplace.json');console.log(m.plugins.map(p=>p.name+'@'+p.version).join('  '))"
```
Expected: `shipwithai-fixkit-core@0.2.0  shipwithai-fixkit-web@0.1.0  shipwithai-fixkit-backend@0.1.0`.

---

### Task 8: Critic refutation pass (worker ≠ grader), then PR

- [ ] **Step 1 — dispatch a fresh critic** (`oh-my-claudecode:critic` or `code-reviewer`, a context
  that did NOT write the code) to refute: (i) the adapter ships no debugging logic / no core edits;
  (ii) the two stub lifecycles genuinely red→green; (iii) the negatives fire the *named* rule codes
  and the controls are accepted; (iv) UI is truly refused; (v) all CI limits + 4-key sync hold;
  (vi) every skill/agent doc ends with `## What this … does NOT do`. Fix anything it surfaces.
- [ ] **Step 2 — re-run all three gates** (Tasks 6–7) after any critic-driven fix; all exit 0.
- [ ] **Step 3 — open the PR** from `phase-2/backend-adapter`. Body: scope (thin adapter), the
  capability matrix (Logic/System FULL, UI NONE), the mechanized acceptance suite results, and the
  explicit note that the **real-bug gate (§9) is deferred** to gate-run. **HALT for Ethan's PR-out
  approval.**

---

## 9. Deferred done-criterion (real-bug gate — needs Ethan's target)

Per handoff §3 + doc 10 §P2, the adapter PR may merge on the mechanized suite, but **P2 is not
"done"** until two **real** bugs close via `/shipwithai-fixkit-core:fix`:
1. a real backend **Logic** bug → `closed` with a failing-test→passing-test proof in the ledger;
2. a real backend **integration/System** bug → `closed` with instrumented-boundary log evidence.

Blocked on Ethan naming: **repo path + test runner + where the two bugs come from** (handoff §3,
Decision 1 = TBD). When provided, run each bug through the engine end-to-end against this adapter and
record the ledger evidence; that closes the phase. This is a **separate** post-merge task, gated.

---

## 10. Open questions for plan-in (HALT — answer at approval)

1. **Q1 — verified-vs-closed evidence gating.** Core today evidence-gates `closed` (not `verified`);
   the layer-method binding fires at both. The negatives (§5) therefore assert method-binding at
   `verified` + evidence at `closed`. **Is that sufficient, or do you want `verified` itself
   evidence-gated?** The latter is a *core* change (tests-first, affects web too) — out of this
   thin-adapter scope unless you say so. *Recommendation: keep as-is for P2; track the stricter
   guard as a separate core ticket.*
2. **Q2 — real-bug target (Decision 1).** Repo path + test runner + source of the two real bugs, for
   the deferred §9 gate. (Not needed to merge the adapter; needed to call P2 "done".)
3. **Q3 — publish trigger branch.** `publish-plugin.yml` fires on `main`; the repo default is
   `master`. The new-plugin 0.1.0 bump will **not** auto-publish from `master`. *Confirm that's
   intended (no action), or flag if the branch should be reconciled — out of P2 scope either way.*

---

## 11. Self-review (against the handoff + doc 09/10)

- **Handoff §2 deliverables:** `CONNECTORS.md` ✅ (Task 5.1); capability Logic/System FULL + UI NONE
  ✅ (Task 1); `environment`/`reproduce`/`verify`/`source-map` recipes ✅ (Task 4); stub fixtures +
  gate wiring ✅ (Tasks 2,3,6). Conventions (limits/evals/sub-skill/"does NOT do"/manifest+skills[]/
  SemVer+4-key/conventional commits/branch) ✅ (Tasks 4–6, throughout).
- **Handoff §3 acceptance:** mechanized — both stub lifecycles ✅, negatives (a)(b)(c) ✅ (Task 6),
  critic pass ✅ (Task 8); real-bug gate deferred + tracked ✅ (§9).
- **Handoff §4 cross-phase bar:** ADR-0002 (this plan + HALTs) ✅; CI limits + evals ✅; "does NOT do"
  everywhere ✅; negative tests ✅; CHANGELOG + versions ✅ (Task 5.7–5.8); evidence (gate runs) ✅.
- **Handoff §5 out-of-scope:** zero core-guard edits (reused read-only) ✅; no P1 close-out, no pin
  migration, no KMP/mobile, no pattern-learning, no org-pack ✅.
- **Doc 09 §§6,7,9,11:** thin adapter shape ✅; capability NONE ⇒ refusal ✅; verification matrix
  (Logic test / System boundary) ✅; mirror principle ✅.
- **Placeholder scan:** every file's full content is inline; the one `cp` (frontmatter.js) is an exact
  copy of a committed, tested file — not a placeholder. No "TBD"/"add error handling"/"similar to".
- **Type/name consistency:** `sumRange`, `handleAtBoundary(req, log)`, `normalizedPath`,
  `accepts(layer)`, rule codes (`VERIFICATION_LAYER_MISMATCH`, `INTEGRITY_EVIDENCE_EMPTY`) and
  `LAYER_METHODS` values (`failing-test-passes`, `instrumented-boundary`) all match core's validator
  and are used identically across fixtures, skills, and the gate.
```
