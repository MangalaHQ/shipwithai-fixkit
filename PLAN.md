# PLAN.md — Phase 4: Android + iOS adapters, diagnosis-assist

> **Status:** awaiting Ethan's approval (ADR-0002 — PLAN first, then autonomous to PR).
> **Author:** Claude Code. **Approver:** Ethan. **Branch:** `phase-4/mobile-adapters` off `main` @ `863de4e` (post-PR #3).
> **The point of this phase:** honest mobile coverage — two thin adapters that **never over-claim**.
> UI = ASSIST, verify = a precise `handoff/v0` device protocol, **zero false `closed`** (no recorded
> `verified_by` → no close). The integrity rule proven on the weakest platforms.
> **Read-only reuse of core** — zero edits to `lib/ledger-validator.js` / `lib/handoff-validator.js` (Decision A).
> Supersedes the P3 plan (preserved in git history at `adf4ee7`).

---

## 0. Decisions for approval (HALT here)

Two decisions need Ethan's sign-off before code. My recommendation is **bold**.

### Decision A — LAYER_METHODS / device proof: **REUSE existing UI methods, do NOT extend core** ✅

The handoff flags any `LAYER_METHODS` change as a core edit needing explicit approval. My finding:
**no extension is needed.** The existing `LAYER_METHODS.UI` methods honestly describe every mobile
device observation:

| Mobile observation | Reused UI method | Honest because |
|---|---|---|
| layout / clipping / overflow / safe-area / Dynamic-Type truncation | `computed-style` | the provider reads rendered geometry/bounds (KMP already uses this for the avatar-row handoff) |
| tap / gesture / navigation / state-change behaviour | `interaction-assertion` | the provider performs an ordered interaction and observes the result |
| logcat / Console.app / crash-log output assertion | `console-assertion` | the provider reads device log output |

→ **Zero edits to `lib/ledger-validator.js` or `lib/handoff-validator.js`.** Adapters reuse core's
validators read-only (exactly as KMP does). Each `*-verify` skill ships a method-mapping table so the
agent picks a legitimate UI method per symptom subtype. This is the handoff's preferred path and the
lowest-risk one — the deterministic trust anchor stays untouched.

*If rejected* (Ethan wants e.g. `screenshot-assertion`): that becomes a separate, tests-first,
additive core sub-task — new method mirrored in **both** `ledger-validator.js` `LAYER_METHODS` **and**
`handoff-validator.js`, with new negative + mutation coverage in **core's** gate. **I recommend
against it** for P4; `computed-style` + `interaction-assertion` cover the real-bug targets cleanly.

### Decision B — iOS Logic/System tier: **FULL/FULL with an explicit macOS-host precondition** ✅

UI = ASSIST is mandatory on both; CC proposes Logic/System.

- **Android — UI = ASSIST, Logic = FULL, System = FULL** (unambiguous; mirrors KMP).
  Logic FULL: `./gradlew testDebugUnitTest` runs JVM unit tests on the host (JUnit/Robolectric),
  observed pass/fail. System FULL: a Gradle build/dependency/config bug is run + observed from the
  host (`./gradlew build`, `~~ci`) — methods `pipeline-run`/`ci-run`/`integration-test`. **Boundary
  note** (kmp-style): a symptom that manifests **only at device runtime** routes to the UI/ASSIST lane.

- **iOS — UI = ASSIST, Logic = FULL, System = FULL, gated on a declared `macOS + Xcode/Swift
  toolchain` precondition.** Rationale: `swift test` (SwiftPM, headless on the host) and the
  unit/logic bundles of `xcodebuild test` run and report **pass/fail on the macOS host** — the agent
  observes the *test result*, not a rendered screen. Same honesty basis as Android's JVM tests. The
  asymmetry vs. Android is **not** a tier difference but a **host requirement** (iOS needs macOS
  specifically), captured prominently in `CONNECTORS.md` + `capability.json.note`. Same boundary note
  (simulator/device-only render symptom, or an XCUITest UI assertion → UI/ASSIST lane).

  *Honest-conservative alternative (flagged, not recommended):* declare **iOS Logic = ASSIST, System =
  ASSIST** if Ethan judges the macOS/simulator dependency too host-fragile to claim FULL. The handoff
  explicitly allows this asymmetry. Cost: the iOS gate then has **no logic-lifecycle stub**
  (assist-only) and loses the host-test honesty demonstration. **I recommend FULL/FULL-with-precondition**
  because the loop *is* honestly host-runnable on this darwin host and symmetry keeps the proof model clean.

> The rest of this plan assumes the **recommended** choices (A: reuse; B: iOS FULL/FULL). If Ethan
> picks the iOS-conservative alternative, the only deltas are: drop `ios-stub-logic` + its
> lifecycle/mutation checks, set `capability.json` iOS Logic/System = ASSIST, and adjust the iOS
> `*-reproduce`/`*-verify` skills + CHANGELOG. No other section changes.

---

## 1. Locked inputs (Ethan, 2026-06-05)

| # | Decision | Value |
|---|---|---|
| 1 | Packaging | Two plugins, one phase/PR — `shipwithai-fixkit-android` + `shipwithai-fixkit-ios`, both on `phase-4/mobile-adapters`, one PR (CI validates each gate separately since PR #3) |
| 2 | Real-bug targets | TBD — Ethan fills at gate-run (one Android + one iOS UI bug; same deferred pattern as P2 §9 / P3) |
| 3 | Verification provider | Ethan/Cowork follows the emitted device protocol on a real device; farms/CI snapshot providers stay future work |
| 4 | P2 + P3 real-bug gates | still open, tracked separately — not this phase's work |

---

## 2. Plugin trees — mirror the KMP shape exactly

Both adapters replicate `plugins/shipwithai-fixkit-kmp/` with a per-platform prefix. Every file CI's
`validate-plugin.yml` requires (`plugin.json`, `manifest.json`, `CLAUDE.md`, `README.md`,
`CHANGELOG.md`, ≥1 SKILL.md, ≥1 evals.json) is present.

```
plugins/shipwithai-fixkit-android/
├── .claude-plugin/
│   ├── plugin.json                 # name, version 0.1.0, skills[] (4 recipes)
│   └── marketplace.json            # top-level version + plugins[0].version (both 0.1.0)
├── manifest.json                   # skills[] registry (skillId/name/description/...)
├── CLAUDE.md  README.md  CHANGELOG.md  CONNECTORS.md
├── lib/capability.json             # { UI: ASSIST, Logic: FULL, System: FULL, note }
├── skills/
│   ├── android-environment/        # user-invocable: true   — locate Gradle wrapper + JDK; build hygiene
│   ├── android-reproduce/          # user-invocable: false  — Logic = failing JVM test; UI(ASSIST) = build+diagnose
│   ├── android-verify/             # user-invocable: false  — Logic = test passes+green; UI(ASSIST) = emit handoff/v0
│   └── android-source-map/         # user-invocable: false  — Activity/Fragment/Compose vs ViewModel vs resource/logic
│       └── (each: SKILL.md + evals/evals.json)
├── tests/
│   ├── run-all.js                  # the blocking gate (6 sections, mirrors KMP)
│   └── lib/frontmatter.js          # copied verbatim from KMP (zero-dep parser)
└── evals/fixtures/
    ├── android-stub-assist/        # handoff.json, ledger.candidate.json, assist.test.js, README.md
    └── android-stub-logic/         # buggy.js, fixed.js, reproduce.test.js, verify.test.js, README.md

plugins/shipwithai-fixkit-ios/      # same shape, ios- prefix, SwiftUI/.xcodeproj specifics
                                    # ios-stub-logic included ONLY under Decision B = FULL
```

Visibility split mirrors KMP exactly: `*-environment` is user-invocable; `*-reproduce`/`*-verify`/
`*-source-map` are `user-invocable: false` (satisfies ≥1 sub-skill). Every SKILL.md ends with
`## What this … does NOT do`; limits respected (SKILL.md <200, refs <150, inline ≤20, desc <200).

### 2.1 `CONNECTORS.md` per adapter

**Android**

| Placeholder | Tool (primary) | Alternatives |
|---|---|---|
| `~~test-runner` | `./gradlew testDebugUnitTest` (host JVM) | `gradlew test`, JUnit, Robolectric |
| `~~ci` | GitHub Actions | local `./gradlew build` |
| `~~runtime` | Gradle / host JVM | — *the device/emulator runtime is what the agent cannot observe* |
| `~~source control` | git + GitHub | local `git` |

**iOS**

| Placeholder | Tool (primary) | Alternatives |
|---|---|---|
| `~~test-runner` | `xcodebuild test` / `swift test` — **requires a macOS host (declared precondition)** | SwiftPM, XCTest |
| `~~ci` | GitHub Actions (macOS runner) | local `xcodebuild` |
| `~~source control` | git + GitHub | local `git` |

Both: **no `~~browser`, no device connector** — that absence is *exactly why UI = ASSIST*. The `## If
<connector> Available` idiom is preserved, plus a `## If a device were Available (it is NOT here)`
section stating: absent a device, UI is ASSIST → emit `handoff/v0` → ledger stops at `candidate`.

### 2.2 `lib/capability.json` per adapter (the `note` carries the boundary rule)

- Android: `{ "UI": "ASSIST", "Logic": "FULL", "System": "FULL", "note": "...testDebugUnitTest on host JVM (Logic); Gradle build/dep/config observed from host (System, pipeline-run/ci-run); Compose/View render on a device with no connector → UI ASSIST, handoff/v0, ceiling candidate. Boundary: device-only-runtime symptom → UI/ASSIST lane." }`
- iOS: same shape; `note` adds the **macOS+Xcode host precondition** and the `swift test`/`xcodebuild
  test` basis; boundary note adds simulator/device-only render + XCUITest → ASSIST lane.

### 2.3 Recipe skills (generic level only — no real project assumed)

- `*-environment` (**user-invocable**): locate toolchain (Gradle wrapper / `.xcodeproj`+scheme or
  `Package.swift`), build hygiene (kill stale Gradle daemons / clear DerivedData), confirm the
  unit-test task exists. Mirrors `kmp-environment`.
- `*-reproduce`: UI (ASSIST) = build + **code-level diagnosis only**, hydrated from the bug
  report/screenshot — the agent must **NOT** claim to have observed the running UI. Logic (FULL) = a
  failing host-runnable unit test, written first.
- `*-verify`: UI (ASSIST) = emit `handoff/v0` (device target + ordered steps + one UI-`LAYER_METHODS`
  assertion with `expected`, `verified_by: null` → ledger stops at `candidate`); ships the Decision-A
  method-mapping table. Logic (FULL) = the failing test passes + suite green (`failing-test-passes`).
- `*-source-map`: Android = Activity/Fragment/Compose tree, ViewModel, resource/layout vs logic;
  iOS = SwiftUI view / UIViewController, ObservableObject/ViewModel, storyboard/asset vs logic.
  Generic rule-of-thumb only (no project-specific paths).

Each skill's `evals/evals.json`: ≥5 prompts, ≥3 `shouldTrigger:true` / ≥2 `false`, each shaped
`{id,prompt,expectedBehavior,category,shouldTrigger}`.

---

## 3. Stub fixtures (zero-dependency Node, deterministic)

Mirror KMP's two-fixture pattern. Synthetic Node modules stand in for the real toolchain — the gate
proves the *discipline*, not a real Gradle/Xcode run (that is the deferred gate-run). Both fixtures
reuse **core's real validators** via the `../../../../shipwithai-fixkit-core/lib` relative path.

### 3.1 `*-stub-assist` (the device-handoff exercise) — both adapters

- `handoff.json`: `version: handoff/v0`, `symptom_layer: UI`, `target: { env: "device", device:
  "Pixel 8 / API 35" (Android) | "iPhone 16 / iOS 18" (iOS), viewport }`, ordered `steps`,
  `assertion: { method: computed-style | interaction-assertion, expected: "<observable>" }`,
  `verified_by: null`.
- `ledger.candidate.json`: state `candidate`, `symptom_layer: UI`, `capability_tier: ASSIST`,
  `root_cause` + `fix` filled, `verification.evidence: ""`, `verified_by: ""`.
- `assist.test.js`: asserts the three KMP invariants — (1) handoff is a valid request, (2) ASSIST UI @
  `candidate` ACCEPTED, (3) forced `closed` (evidence+verified_by filled) REFUSED with
  `ASSIST_CANNOT_CLOSE`.
- Placeholder bugs (until Ethan's real targets, §1.2): Android = a bottom-nav bar overlapping list
  content in landscape (`computed-style`); iOS = a Dynamic-Type label truncating on a Detail screen
  (`computed-style`).

### 3.2 `*-stub-logic` (host-runnable lifecycle) — both adapters under Decision B = FULL

- Synthetic shared-logic bug analog (like KMP's VAT `gross()`): a pure function consumed by the
  platform layer. Android e.g. a price/discount calculator; iOS e.g. a date/duration formatter.
- `buggy.js` / `fixed.js`; `reproduce.test.js` asserts expected behaviour against `buggy` → **fails**
  (the reproduction); `verify.test.js` asserts against `fixed` → **passes** (`failing-test-passes`).

---

## 4. The blocking gate `tests/run-all.js` (per adapter — mirrors KMP §1–6, BLOCKING)

1. **Stub lifecycles**: logic `reproduce` FAILS on buggy / `verify` PASSES on fixed (FULL only);
   assist handoff valid + candidate accepted + closed refused.
2. **Capability**: assert `UI==='ASSIST' && Logic==='FULL' && System==='FULL'` from `capability.json`.
3. **Negatives + ACCEPT controls** (core's real validators — single source of truth):
   - **(a) zero false `closed`**: ASSIST UI forced `closed` (evidence+verified_by+fix filled, so the
     ceiling is the *only* blocker) → `ASSIST_CANNOT_CLOSE`. Control: same ledger @ `candidate`
     ACCEPTED. Plus a *filled* ASSIST UI ledger @ `verified` (UI method + fix) ACCEPTED — proving a
     filled handoff **advances** per core's rules while the `closed` ceiling still holds (encodes the
     headline: never `closed` without a recorded `verified_by`; for ASSIST, never `closed` at all).
   - **(b) handoff binding**: non-UI proof → `HANDOFF_LAYER_MISMATCH`; missing `verified_by` slot →
     `HANDOFF_NO_VERIFIED_BY_SLOT`; **missing `target.env` → `HANDOFF_NO_TARGET_ENV`** (P4 adds this
     beyond KMP). Control: a complete unfilled device handoff ACCEPTED.
   - **(c) logic binding + integrity** (FULL only): Logic verified by a UI method →
     `VERIFICATION_LAYER_MISMATCH`; Logic `closed` without evidence → `INTEGRITY_EVIDENCE_EMPTY`.
     Control: Logic `closed` with `failing-test-passes` + evidence ACCEPTED.
4. **Mutation checks (≥2 required; shipping 3–4)**: **M1** capability flip (UI→FULL breaks §2
   predicate); **M2** lifecycle flip (reproduce vs `fixed.js` PASSES → reproduction is buggy-specific,
   FULL only); **M3** drop `assertion.expected` → `HANDOFF_NO_EXPECTED`; **M4** (bonus) drop
   `target.env` → `HANDOFF_NO_TARGET_ENV`.
5. **Convention + eval-schema linters**: ≥4 skills; `## What this … does NOT do`; SKILL.md <200;
   inline ≤20; desc <200; ≥1 `user-invocable:false`; evals ≥5 with the `{id,prompt,expectedBehavior,
   category,shouldTrigger}` shape and ≥3/≥2 split.
6. **4-key version sync**: `plugin.json` == per-plugin marketplace top == `plugins[0]` == root entry (all `0.1.0`).

**Regression:** core / web / backend / kmp gates must still exit 0 (run all six after building both).

---

## 5. Version / marketplace impact (4-key sync × 2, two root entries)

- Two new plugins, each `version: 0.1.0`, synced across all four keys from the start.
- **Add two entries** to root `.claude-plugin/marketplace.json` `plugins[]` (android, ios) @ 0.1.0.
  Root top-level `version` stays `0.1.0` (catalog version; KMP's addition didn't bump it — confirmed).
- **No existing plugin version changes** — core stays `0.2.0`; web/backend/kmp untouched (read-only reuse).
- Per-plugin `CHANGELOG.md` (0.1.0 initial), modelled on KMP's.
- On merge to `main`, `publish-plugin.yml` auto-detects the two new `plugin.json` files and publishes
  both @ 0.1.0 (matrix, per plugin).

---

## 6. CI (acceptance criterion #1 — confirmed mechanism)

`validate-plugin.yml` (post-PR #3) diffs `plugins/**` against the PR base SHA, builds a **per-plugin
matrix**, and runs each `tests/run-all.js`. The two new plugin dirs are auto-detected → **both new
gates execute separately on the PR with no workflow edit**. The run URL goes in the PR.

---

## 7. Acceptance suite = the Phase-4 gate (doc 10 §P4) — coverage map

| Acceptance item | Where satisfied |
|---|---|
| §3.1 both gates green; core/web/backend/kmp stay green; CI executes both | gate §1 + regression run of all six + §6 |
| §3.2a zero false `closed` (`ASSIST_CANNOT_CLOSE`) + candidate control + filled-advance control | gate §3(a) |
| §3.2b `HANDOFF_LAYER_MISMATCH` / `HANDOFF_NO_VERIFIED_BY_SLOT` / `HANDOFF_NO_TARGET_ENV` + control | gate §3(b) |
| §3.2c (FULL) `VERIFICATION_LAYER_MISMATCH` / `INTEGRITY_EVIDENCE_EMPTY` + control | gate §3(c) |
| §3.3 ≥2 mutation checks (capability flip + ≥1 handoff-path) | gate §4 (3–4 mutations) |
| §3.4 critic refutation pass (worker ≠ grader) | architect/critic review before PR (Ralph Step 7) |
| Cross-phase bar (§4): limits, evals, negatives, CHANGELOG+versions, evidence | gate §5–6 + §5 above |

**Deferred to gate-run (needs Ethan's targets — §1.2, TBD):** one real Android UI bug + one real iOS
UI bug → fix `candidate` + a precise device-verification protocol; Ethan/Cowork executes it on a real
device and fills `verified_by`. **Neither bug ever reaches `closed` without a recorded `verified_by`**
— the phase headline. The PR may merge on the mechanized suite; **P4 is not "done" until both real runs land.**

---

## 8. Negatives, controls, mutations — summary table (per adapter)

| Check | Input | Expected | Type |
|---|---|---|---|
| ASSIST ceiling | UI ASSIST ledger → `closed` (filled) | `ASSIST_CANNOT_CLOSE` | negative (a) |
| control | same ledger @ `candidate` | ACCEPTED | control (a) |
| advance | filled ASSIST UI ledger @ `verified` (UI method) | ACCEPTED (still can't close) | control (a) |
| handoff layer | UI handoff asserts `test-run` | `HANDOFF_LAYER_MISMATCH` | negative (b) |
| handoff slot | drop `verified_by` key | `HANDOFF_NO_VERIFIED_BY_SLOT` | negative (b) |
| handoff target | drop `target.env` | `HANDOFF_NO_TARGET_ENV` | negative (b) |
| control | complete unfilled device handoff | ACCEPTED | control (b) |
| logic layer (FULL) | Logic @ `verified` by UI method | `VERIFICATION_LAYER_MISMATCH` | negative (c) |
| logic integrity (FULL) | Logic @ `closed`, evidence empty | `INTEGRITY_EVIDENCE_EMPTY` | negative (c) |
| control | Logic @ `closed`, `failing-test-passes` + evidence | ACCEPTED | control (c) |
| M1 | capability UI→FULL | §2 predicate breaks | mutation |
| M2 (FULL) | reproduce vs `fixed.js` | PASSES (buggy-specific) | mutation |
| M3 | drop `assertion.expected` | `HANDOFF_NO_EXPECTED` | mutation |
| M4 | drop `target.env` | `HANDOFF_NO_TARGET_ENV` | mutation |

---

## 9. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Over-claiming iOS FULL (Decision B) | explicit macOS+Xcode precondition in CONNECTORS.md + capability `note`; conservative ASSIST alternative is one approval away; the stub proves *discipline*, the real loop is the deferred gate-run |
| Silent `LAYER_METHODS` drift | Decision A = **zero** core edits; any new method is a separate tests-first core sub-task, never silent |
| CI not executing the new gates | confirmed auto-discovery (§6); run URL pasted in the PR |
| Convention-limit regressions (SKILL.md ≥200, missing "does NOT do", eval shape) | each gate's §5 linters bite locally before push; CI re-checks |
| Negative passes for the wrong reason | each negative isolates its code (other required fields populated) **and** pairs with an ACCEPT control; mutations (§4) prove the gate bites |
| Stub realism vs determinism | synthetic Node fixtures (KMP-proven) keep the gate hermetic; realism is the deferred gate-run with Ethan's real targets |

---

## 10. Out of scope (per handoff §5)

P2/P3 real-bug gates (tracked separately) · device farms / CI snapshot verification providers ·
emulator/simulator tooling · pattern-learning + distribution (P5) · org pack / focus repo changes ·
extending core guards or `LAYER_METHODS` without the §0 Decision-A approval path · **touching core
guards** (read-only reuse; if anything in core must change, HALT first with a tests-first proposal).

---

## 11. Execution order (after approval)

1. Scaffold the `android` tree (§2): copy KMP, re-prefix, adjust CONNECTORS/capability/skills/fixtures.
2. Write Android stub fixtures (§3) — `android-stub-logic` then `android-stub-assist`.
3. Write the 4 Android recipe skills + `evals.json` (§2.3); write Android `tests/run-all.js` (§4); iterate to green.
4. Scaffold the `ios` tree (§2) honouring Decision B; stubs (§3); skills; `tests/run-all.js`; iterate to green.
5. Add the two root marketplace entries (§5); per-plugin CHANGELOG/README/CLAUDE.md.
6. Run **all six** gates locally (core/web/backend/kmp/android/ios) → all green.
7. Critic refutation pass (worker ≠ grader); address findings. Deslop pass on changed files; re-run all six gates.
8. Conventional commits; push; open one PR `phase-4/mobile-adapters` → `main`; paste CI run URL. HALT for the gate-run (real targets).

---

## What this PLAN does NOT do
- It does not modify core, web, backend, or kmp source (read-only reuse of core's validators only).
- It does not extend `LAYER_METHODS` or any core guard (Decision A = reuse), and wires no device/`~~browser` connectors.
- It does not run the real Gradle/Xcode bug gate — that is the deferred gate-run (needs Ethan's targets + a real device).
- It does not close the two real mobile bugs — neither reaches `closed` without a recorded `verified_by`.
- It does not begin implementation — it **HALTS here for Ethan's approval** (ADR-0002).
