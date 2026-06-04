# PLAN.md — Phase 3: KMP adapter, logic lane (`shipwithai-fixkit-kmp`)

> **Status:** awaiting Ethan's approval (ADR-0002 — PLAN first, then autonomous to PR).
> **Author:** Claude Code. **Approver:** Ethan. **Branch:** `phase-3/kmp-adapter` off `main` @ `2f8e0e8`.
> **The point of this phase:** the **first real ASSIST exercise** — the engine proves it refuses to
> over-claim on a platform it cannot observe: it emits `handoff/v0` and stops the ledger at `candidate`.
> **Read-only reuse of core** — zero edits to `lib/ledger-validator.js` / `lib/handoff-validator.js`.

---

## 0. Decisions this PLAN resolves (per handoff §0)

| # | Decision needed | Proposal | Justification |
|---|---|---|---|
| **System tier** | FULL or ASSIST? | **System = FULL** | Doc 09 §6: FULL = "agent can run + observe the artifact." A KMP System-layer bug (Gradle build, dependency resolution, build config) is observed by running `./gradlew build` / CI on the JVM/host — the agent sees success/failure, the dependency tree, and error output directly. Proof methods `pipeline-run` / `ci-run` / `integration-test` map cleanly (mirrors backend System=FULL). **Boundary:** a System symptom that manifests *only* at platform runtime (device-only, unobservable from the host) is not a host-System bug — it belongs to the UI=ASSIST lane (handoff) or P4. This boundary is documented in `capability.json.note` + `CONNECTORS.md`. |
| **UI tier** | (locked) | **UI = ASSIST** | Compose/SwiftUI render on a device the agent cannot observe (no `~~browser`, no device connector). Build + diagnose only; verify emits `handoff/v0`, ceiling `candidate`. |
| **Logic tier** | (locked) | **Logic = FULL** | Shared `commonMain` logic runs on the JVM via `~~test-runner` (`./gradlew :shared:test`). Failing test → passes + suite green. |

**`lib/capability.json` = `{ "UI": "ASSIST", "Logic": "FULL", "System": "FULL" }`** — the **first adapter
to declare a standing `ASSIST` tier** (backend=UI NONE; web=UI FULL with only a prose downgrade note).

---

## 1. Full tree — `plugins/shipwithai-fixkit-kmp/`

Mirrors the backend plugin's shape (doc 09 §9). Every file CI requires is present.

```
plugins/shipwithai-fixkit-kmp/
├── .claude-plugin/
│   ├── plugin.json                 # name, version 0.1.0, skills[] (4 recipes)
│   └── marketplace.json            # top-level version + plugins[0].version (both 0.1.0)
├── manifest.json                   # skills[] registry (skillId/name/description/...)
├── CLAUDE.md                       # runtime guidance (mirrors backend/web CLAUDE.md)
├── README.md                       # required by CI
├── CHANGELOG.md                    # required by CI; 0.1.0 initial entry
├── CONNECTORS.md                   # ~~category → KMP tooling (see §2)
├── lib/
│   └── capability.json             # { UI: ASSIST, Logic: FULL, System: FULL } + note
├── skills/
│   ├── kmp-environment/            # locate Gradle wrapper + JVM; clean build state
│   │   ├── SKILL.md                # user-invocable: true
│   │   └── evals/evals.json
│   ├── kmp-reproduce/              # Logic = failing JVM test; UI(ASSIST) = build+diagnose only
│   │   ├── SKILL.md                # user-invocable: false (internal recipe)
│   │   └── evals/evals.json
│   ├── kmp-verify/                 # Logic = test passes+suite green; UI(ASSIST) = emit handoff/v0
│   │   ├── SKILL.md                # user-invocable: false (internal recipe)
│   │   └── evals/evals.json
│   └── kmp-source-map/             # commonMain vs androidMain/iosMain; expect/actual seams
│       ├── SKILL.md                # user-invocable: false (internal recipe)
│       └── evals/evals.json
├── tests/
│   ├── run-all.js                  # the blocking KMP gate (see §4)
│   └── lib/frontmatter.js          # copied verbatim from backend/web (zero-dep parser)
└── evals/fixtures/
    ├── kmp-stub-logic/             # shared-logic lifecycle (reproduce→verify, Node-simulated)
    │   ├── buggy.js  fixed.js
    │   ├── reproduce.test.js  verify.test.js
    │   └── README.md
    └── kmp-stub-assist/            # the ASSIST exercise (handoff/v0 + candidate ledger)
        ├── handoff.json            # emitted handoff/v0 (verified_by: null) — a valid request
        ├── ledger.candidate.json   # synthetic ASSIST UI ledger at `candidate`
        ├── assist.test.js          # asserts handoff valid + candidate accepted (via core validators)
        └── README.md
```

`≥1 user-invocable:false` sub-skill: `kmp-reproduce`, `kmp-verify`, `kmp-source-map` are internal
recipes (`user-invocable: false`); `kmp-environment` is user-invocable. Every SKILL.md ends with
`## What this … does NOT do`. All limits respected (SKILL.md <200, inline ≤20, desc <200).

---

## 2. `CONNECTORS.md` mappings

| Placeholder | KMP tool (primary) | Alternatives |
|---|---|---|
| `~~test-runner` | `./gradlew :shared:test` (JVM) | `gradlew test`, Kotest, JUnit, maven |
| `~~ci` | GitHub Actions | local `./gradlew build` |
| `~~runtime` | **JVM** (shared logic runs here) | — *the platform runtime is what the agent cannot observe* |
| `~~source control` | git + GitHub | local `git` |

**No `~~browser`, no device connector** — that absence is *exactly why UI = ASSIST*. The `## If
<connector> Available` idiom is preserved; the UI section states: absent a device/`~~browser`, UI is
ASSIST → emit `handoff/v0` → ledger stops at `candidate`.

---

## 3. Stub-fixture design (zero-dependency Node — the gate stays deterministic)

Real Gradle/JVM proof is the **deferred gate-run** (needs Ethan's KMP target). These stubs simulate
the lifecycle in pure Node so the gate runs in CI with no toolchain.

### 3a. `kmp-stub-logic` (the FULL shared-logic lane)
Mirrors `backend-stub-logic` exactly: a synthetic `commonMain`-style pure function with a wrong-value
bug (e.g. a shared formatter/range/calc that is wrong on *both* platforms ⇒ shared-logic root cause).
- `reproduce.test.js`: the expected behaviour run against `buggy.js` → **fails (exit ≠ 0)**. The
  failing run *is* the reproduction (Logic idiom, doc 09 §7).
- `verify.test.js`: the *same* assertion run against `fixed.js` → **passes (exit 0)** + extra edges.
  Mirror principle: verified by the failing test passing, never by a diff.

### 3b. `kmp-stub-assist` (the ASSIST UI lane — the novel exercise)
A Compose/SwiftUI UI bug cannot be observed from the host, so there is no failing→passing test. The
"lifecycle" is the **correct ASSIST outcome**, checked against *core's real validators*:
- `handoff.json` — an emitted `handoff/v0` for the UI bug: `symptom_layer: "UI"`, a UI `LAYER_METHODS`
  `assertion.method` (e.g. `computed-style`), `target.env`, non-empty `steps`, `assertion.expected`,
  and `verified_by: null`. This is a **valid request**, not a failure.
- `ledger.candidate.json` — a synthetic ASSIST UI ledger at `state: candidate` with non-empty
  `root_cause` and `verification.capability_tier: "ASSIST"` (satisfies all `validateLedger` invariants
  for `candidate`; `fix`/`evidence` are only required at `verified`/`closed`).
- `assist.test.js` — `require`s core `validateHandoff` + `validateLedger` and asserts the **red→green**
  pair: **GREEN** `validateHandoff(handoff).ok === true` and `validateLedger(candidate).ok === true`;
  **RED** the same ledger forced to `state: closed` → not-ok with `ASSIST_CANNOT_CLOSE`. Exit 0 only if
  all three hold. This *is* the assist stub's "lifecycle" (you must NOT close; you MUST emit a valid
  handoff and stop at candidate).

---

## 4. The KMP gate — `tests/run-all.js` (BLOCKING; exit 0 = green)

Sections (extends the backend gate; **all negatives reuse core's real validators — zero core edits**):

1. **Stub lifecycles** — `kmp-stub-logic` red→green via `runLifecycle` (reproduce fails / verify
   passes); `kmp-stub-assist` via `assist.test.js` (handoff valid + candidate accepted + closed
   refused). *(maps acceptance §3.1)*
2. **Capability declaration** — assert `capability.json` = `UI: ASSIST, Logic: FULL, System: FULL`.
3. **Negative tests + ACCEPT controls** (via core `validateLedger` / `validateHandoff`):
   - **(a) ASSIST ceiling.** ASSIST UI ledger forced to `closed` (with evidence + verified_by + fix
     populated, so the *only* failing code is the ceiling) → **`ASSIST_CANNOT_CLOSE`**. Control: same
     ledger at `candidate` → **ACCEPTED**. *(§3.2a)*
   - **(b) Handoff path.** UI handoff asserting a Logic method (`test-run`) → **`HANDOFF_LAYER_MISMATCH`**;
     a handoff object with the `verified_by` **key removed** → **`HANDOFF_NO_VERIFIED_BY_SLOT`**.
     Control: a complete handoff with `verified_by: null` → **ACCEPTED** (a valid request). *(§3.2b)*
   - **(c) Logic binding + integrity.** Logic@`verified` with a non-test method (`computed-style`) →
     **`VERIFICATION_LAYER_MISMATCH`**; Logic@`closed` with empty `evidence` →
     **`INTEGRITY_EVIDENCE_EMPTY`**. Control: Logic@`closed` with `failing-test-passes` + evidence +
     fix + verified_by → **ACCEPTED**. *(§3.2c)*
4. **Mutation checks** (prove the gate *bites* — not green-by-construction): *(§3.3)*
   - **capability flip** — in-memory set `UI: "FULL"`; assert the §2 capability check would now fail.
   - **lifecycle flip** — run `kmp-stub-logic/verify.test.js` against `buggy.js`; assert it **fails**
     (the verify assertion genuinely discriminates fixed from buggy).
   - **handoff-path mutation** — take the valid handoff, delete `assertion.expected`; assert
     `validateHandoff` flips ok→not-ok with **`HANDOFF_NO_EXPECTED`**.
5. **Convention + eval-schema linters** — identical to backend/web: ≥4 skills; SKILL.md <200; inline
   ≤20; `description` <200; ≥1 `user-invocable:false`; ends with `## What this … does NOT do`; each
   `evals.json` ≥5 with the `{id,prompt,expectedBehavior,category,shouldTrigger}` shape and ≥3/≥2 split.
6. **4-key version sync** — `plugin.json` == per-plugin `marketplace.json` top == `plugins[0]` == root
   `marketplace.json` kmp entry (all `0.1.0`).

**Regression:** core / web / backend gates must still exit 0 (run all four after building kmp).

---

## 5. Version / marketplace impact

- **New plugin `shipwithai-fixkit-kmp` @ `0.1.0`** (initial). 4-key sync wired from the start:
  `plugin.json` (`0.1.0`) == per-plugin `marketplace.json` top (`0.1.0`) == `plugins[0].version`
  (`0.1.0`) == **new entry appended to root `.claude-plugin/marketplace.json`** (`0.1.0`).
- Root marketplace top-level `version` (the catalog version) is left unchanged — adding a plugin entry
  is additive (matches how backend was added without bumping the catalog).
- **No core / web / backend version bumps** — read-only reuse; their files are untouched.
- `CHANGELOG.md` (new plugin): `0.1.0 — initial KMP adapter (Logic FULL, System FULL, UI ASSIST + handoff/v0)`.
- Design doc 09 §14 already lists `kmp` in the repo plan — no design-doc change needed.
- CI: `validate-plugin.yml` auto-discovers the new plugin dir (matrix from `git diff`) and runs its
  `tests/run-all.js` — **no CI edit required**.

---

## 6. Acceptance suite = the Phase-3 gate (doc 10 §P3) — coverage map

| Acceptance item | Where satisfied |
|---|---|
| §3.1 both stub lifecycles red→green; other gates stay green | gate §1 + regression run of all four gates |
| §3.2a `ASSIST_CANNOT_CLOSE` + candidate control | gate §3(a) |
| §3.2b `HANDOFF_LAYER_MISMATCH` / `HANDOFF_NO_VERIFIED_BY_SLOT` + unfilled-handoff control | gate §3(b) |
| §3.2c `VERIFICATION_LAYER_MISMATCH` / `INTEGRITY_EVIDENCE_EMPTY` + control | gate §3(c) |
| §3.3 ≥2 mutation checks + 1 handoff-path mutation | gate §4 (3 mutations) |
| §3.4 critic refutation pass (worker ≠ grader) | architect/critic review before PR (Ralph Step 7) |
| Cross-phase bar (§4): limits, evals, negative tests, CHANGELOG+versions, evidence | gate §5–6 + §5 above |

**Deferred to gate-run (needs Ethan's KMP target — Decision 1, TBD):** one real shared-logic bug →
`closed` via JVM test evidence; one real Compose/SwiftUI bug → stops at `candidate` + `handoff/v0`,
then Ethan/Cowork executes the protocol and fills `verified_by`. **The adapter PR may merge on the
mechanized suite; P3 is not "done" until both real-bug runs complete.**

---

## 7. Risks & mitigations

| Risk | Mitigation |
|---|---|
| ASSIST stub conflates the handoff artifact with a "lifecycle" | model ASSIST as an explicit **red→green** pair (closed refused / candidate+handoff accepted) — a genuine two-sided check, not a tautology |
| System=FULL over-claims (device-only bugs) | scope System FULL to host-observable Gradle build/dep/config; document the device-runtime boundary in `capability.json.note` + `CONNECTORS.md`; such symptoms route to UI/ASSIST or P4 |
| Drift from core if handoff/ledger codes change | **read-only reuse** — `require` core validators, never copy; if core *must* change, HALT + tests-first (out of scope here) |
| Zero-dep constraint vs. "real" KMP proof | stubs are pure Node (deterministic CI); real Gradle/JVM proof is the **deferred gate-run**, explicitly tracked |
| Negative tests pass for the wrong reason | each negative **isolates** its code (populate all other required fields) **and** pairs with an ACCEPT control; mutation checks (§4) prove the gate bites |
| `LAYER_METHODS` lacks device-specific proof methods | not needed for P3 (UI methods suffice for the handoff); flagged as a **P4 decision** (out of scope) |

---

## 8. Out of scope (per handoff §5)

P2 real-bug gate (tracked separately) · Android/iOS adapters + device verification providers (P4) ·
extending `LAYER_METHODS` with device proof methods (P4) · pattern-learning (P5) · org pack / focus
repo · publishing beyond what the merge triggers · **touching core guards** (read-only reuse; if
anything in core must change, HALT first with a tests-first proposal).

---

## 9. Execution order (after approval)

1. Scaffold the tree (§1): `plugin.json`, `marketplace.json`, `manifest.json`, `CLAUDE.md`, `README.md`,
   `CHANGELOG.md`, `CONNECTORS.md`, `lib/capability.json`, `tests/lib/frontmatter.js`.
2. Write the two stub fixtures (§3) — `kmp-stub-logic` then `kmp-stub-assist`.
3. Write the 4 recipe skills + `evals.json` (§1) — mirror backend/web, adapt to KMP seams.
4. Write `tests/run-all.js` (§4); iterate until green.
5. Add the root marketplace entry (§5); run **all four** gates (regression).
6. CHANGELOG + README; self-check limits/evals.
7. Critic refutation pass (worker ≠ grader); fix findings.
8. Deslop pass on changed files; re-run all four gates.
9. Open PR `phase-3/kmp-adapter` → `main`.

---

## What this PLAN does NOT do
- It does not modify core, web, or backend source (read-only reuse of core's validators only).
- It does not run the real Gradle/JVM bug gate — that is the deferred gate-run (needs Ethan's target).
- It does not extend `LAYER_METHODS` or any core guard, and does not wire device/`~~browser` connectors.
- It does not begin implementation — it HALTS here for Ethan's approval (ADR-0002).
