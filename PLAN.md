# PLAN — Merge `shipwithai-fixkit-web-harness` into `shipwithai-fixkit-web` (web → 0.3.0)

> **Status: APPROVED by Ethan (2026-06-11) with one deviation ruling** — commit ④ added: guard the
> `publish-plugin.yml` detect step against deleted plugin manifests (Ethan's correction: a
> push-triggered workflow runs the workflow file AT the merge commit, so a guard landed in this PR
> is effective immediately; the §6 claim "nothing in this branch can fix main-side workflow
> behavior" was wrong). Branch: `phase-1/merge-web-harness` (created off `main`). No merge to
> `main`, no push — Ethan owns PR + publish timing. Supersedes the Sprint-2 plan (preserved in git
> history, merged as PR #11).
> Source of truth: `../shipwithai-fixkit-design/handoffs/CC-MERGE-WEB-HARNESS.md`.
> **Ralplan consensus (2026-06-11):** Architect = SOUND-WITH-CHANGES (all 4 changes folded in:
> astro-recipes code-fence paths §2, cwd-first ordering invariant §3.2, Tier-B probe stays plain
> §3.1.8, publish-workflow note §6) → Critic = **APPROVE** (M1 grep-manifest + 2 minor precision
> fixes folded in). Worker ≠ grader: both reviews ran as fresh agents.

## 0. RALPLAN-DR summary

**Principles**
1. Zero dropped checks — every existing gate check survives verbatim or is strictly superseded by an
   equal-or-stricter check; the diff is accounted check-by-check (§3.3), not by count.
2. Trust anchor untouched — zero diff under `plugins/shipwithai-fixkit-core/lib/`; core gate stays 99 ✓.
3. Tests-first for the one behavior change — the `drive.js` playwright-resolution fix lands only after
   a new gate check is shown RED against the old behavior.
4. History preserved — `git mv` for moved files; harness CHANGELOG appended (sectioned), never rewritten.
5. Conventions stay BLOCKING — quality limits, 4-key sync, layering (no upward imports).

**Decision drivers (top 3)**
1. Ethan's ruling: 3-plugin install confuses users; harness is always co-installed with web; the focus
   pack pins only core + web → the split has no operational value.
2. Timing: QUICKSTART-FE just shipped — merge BEFORE external adoption grows.
3. The `NODE_PATH` remediation is a papercut for every FE adopter; cwd-resolution kills it.

**Options considered**
- **A (chosen): full merge per handoff** — fold harness into web 0.3.0, single combined gate, bundle
  follow-ups (a) wrong-org URLs and (b) cwd playwright resolution.
- **B: keep both plugins, fix only (a)+(b)** — rejected: contradicts the approved ruling; keeps the
  3-plugin install list.
- **C: merge plugin but keep two gate files** (`tests/run-all.js` + `tests/harness-gate.js`) —
  rejected: two greens to track; the handoff explicitly says "merge the harness gate into
  `web/tests/run-all.js`"; one file with sections is the existing house style.

## 1. File moves (17 harness files → web, then delete the harness dir)

| Harness file | Destination in `plugins/shipwithai-fixkit-web/` | How |
|---|---|---|
| `skills/browser-drive/SKILL.md` | `skills/browser-drive/SKILL.md` | `git mv`; update drive.js paths (3 hits) + prerequisite wording (install playwright in the *target project*) |
| `skills/browser-drive/evals/evals.json` | `skills/browser-drive/evals/evals.json` | `git mv` unchanged (5 evals, 3/2 split ✓) |
| `lib/drive.js` | `lib/drive.js` | `git mv`; then (b) fix in its own tests-first commit |
| `lib/measures.js` | `lib/measures.js` | `git mv` unchanged (no measure/method renames — ledger compat) |
| `evals/fixtures/smoke-page/{broken,fixed}.html` | `evals/fixtures/smoke-page/` | `git mv` unchanged |
| `evals/fixtures/contract/harness-ui-close.{valid,drift-method}.md` | `evals/fixtures/contract/` | `git mv` unchanged |
| `tests/run-all.js` | merged INTO `tests/run-all.js` | section-by-section merge, see §3 |
| `tests/lib/frontmatter.js` | — | web already vendors it; the two copies differ in COMMENTS ONLY (critic-verified, parser body identical) — keep web's copy, drop the harness copy |
| `CHANGELOG.md` | appended into `CHANGELOG.md` | clearly sectioned "Historical — shipwithai-fixkit-web-harness (pre-merge)" |
| `README.md` | folded into `README.md` | runner table + prerequisite section; fix wrong-org URL on the way in |
| `CLAUDE.md` | folded into `CLAUDE.md` | mechanism description, config profile, security note, merged-gate description |
| `CONNECTORS.md` | folded into `CONNECTORS.md` | `~~browser` primary becomes the *bundled* runner (`lib/drive.js`) |
| `manifest.json` | merged into `manifest.json` | add the `browser-drive` skill entry |
| `.claude-plugin/plugin.json` | deleted | content absorbed by web's plugin.json (version, keywords, skills) |
| `.claude-plugin/marketplace.json` | deleted | harness ceases to exist as a marketplace entry |

Then `git rm -r plugins/shipwithai-fixkit-web-harness/` leaves nothing behind.
(`plugins/shipwithai-fixkit-web/.omc/state/` is gitignored noise — untouched.)

## 2. Reference updates (every live `web-harness` mention in the engine repo)

| File | Change |
|---|---|
| `README.md:24,27` | tree line + adapters sentence drop `web-harness`; add a short **migration note**: users who installed `shipwithai-fixkit-web-harness` should uninstall it — `shipwithai-fixkit-web@0.3.0` now contains the runner |
| `docs/QUICKSTART-FE.md:17` | install list drops to **2 plugins** (core + web) |
| `docs/QUICKSTART-FE.md:46-49` | remove the `NODE_PATH` remediation bullet — only in the commit AFTER (b) is green |
| root `.claude-plugin/marketplace.json` | **remove** the harness entry; bump web entry to 0.3.0 + refresh its description (now ships the in-loop Playwright runner: 6 measures onto the 5 UI LAYER_METHODS) |
| `web/.claude-plugin/plugin.json` | 0.3.0; `repository` → `https://github.com/MangalaHQ/shipwithai-fixkit` (wrong-org fix); description += runner; `skills` += `./skills/browser-drive`; keywords += `playwright`, `headless` |
| `web/.claude-plugin/marketplace.json` | 0.3.0 in top-level AND `plugins[0]`; description refresh |
| `web/CHANGELOG.md` | new `[0.3.0]` entry naming the merge + (a) + (b); append harness history section |
| `web/CONNECTORS.md:10,17-19` | drive.js path → `plugins/shipwithai-fixkit-web/lib/drive.js`; "web-harness Playwright runner" → "bundled Playwright runner" |
| `web/CONNECTORS.md:25` | example `verified_by` `ui-bug-agent (web-harness/playwright)` → `ui-bug-agent (web/playwright)` (illustrative "e.g." string only; no ledger key/method renamed) |
| `web/lib/capability.json` (note) | "shipwithai-fixkit-web-harness Playwright runner" → "the bundled Playwright runner (`lib/drive.js`)" |
| `web/skills/astro-recipes/SKILL.md:3,14` + `evals/evals.json` (2 hits) | "web-harness measure" → "browser-drive measure" (description stays < 200 chars) |
| `web/skills/astro-recipes/SKILL.md:46,70,93` | code-fence command paths `plugins/shipwithai-fixkit-web-harness/lib/drive.js` → `plugins/shipwithai-fixkit-web/lib/drive.js` (architect-found; acceptance-grep blocker if missed) |
| `web/CLAUDE.md`, `web/README.md`, `web/manifest.json` | absorb harness content per §1 |
| `PLAN.md` | replaced by this plan (its own mentions are the plan subject — excluded from the acceptance grep) |

CHANGELOG **history** entries that mention web-harness (e.g. web `[0.2.0]`) are historical and stay
verbatim. Slash-path references `/shipwithai-fixkit-web-harness:` — repo-wide grep found none
(browser-drive is `user-invocable:false`); re-verified at execution.

**The table above is a map, not the authority (architect ruling):** at execution, the edit list is
re-derived from a fresh `grep -rn "web-harness"` AND `grep -rn "shipwithai-fixkit-web-harness"`
sweep run BEFORE commit 1 and re-run AFTER all edits (must be zero live hits) — the grep drives the
sweep, the table only predicts it. The sweep runs before the `git rm -r` of the harness dir.

**Execution note (commit ⑤, grep-authority deviation):** the md/json/js-filtered grep missed
`.github/workflows/harness-smoke.yml` (Tier C), which ran the DELETED harness gate path and pinned
`pull_request.paths` to the deleted plugin — left alone, the PR's own CI breaks and the Tier-C smoke
goes dark forever. Handoff §2.3 mandates a repo-wide reference sweep (no extension filter), so this
IS a reference site; retargeted to `plugins/shipwithai-fixkit-web/**` + the merged gate in its own
clearly-labeled commit (easy for Ethan to drop). The workflow's NODE_PATH mechanism (CI-side, not
the user-facing remediation) was re-verified against the new cwd-first drive.js with a stub:
fallback resolution still honors NODE_PATH when the invoking cwd has no node_modules.

Out of scope (per handoff §5): the other 5 wrong-org URLs (core/backend/kmp/android/ios plugin.json),
focus-pack re-pin, stub adapters, design repo, shipwithai.io.

## 3. The merged gate — `web/tests/run-all.js`

### 3.1 Section layout (one file, house style)
1. web-stub lifecycle — **2 checks** (unchanged)
2. capability declaration — **1** (unchanged)
3. `measures.js` pure-helper unit test — **22** (moved verbatim from harness §1; still pins method
   strings against core `LAYER_METHODS.UI` via the sibling require of the trust anchor)
4. cross-plugin contract test — **2** (moved verbatim from harness §2; fixtures path updated)
5. **NEW (b): playwright cwd-resolution — 3 checks** (§3.2)
6. convention + eval-schema linters over **6 skills** — `>=4 skills` (1) + 6×4 per-skill (24) +
   `>=1 user-invocable:false` (1) + 6×3 evals (18) = **44**
7. 4-key version sync — **1** (web; the harness's own sync check dies with the plugin)
8. Tier B conditional Playwright smoke — **14 checks**, moved verbatim (paths updated); still SKIPs
   when playwright is absent and **never blocks** the green. **The Tier-B run-or-skip probe stays the
   plain `require.resolve('playwright')` — deliberately NOT cwd-aware** (architect synthesis): only
   drive.js's internal resolution changes, so the 6-months-stable deterministic SKIP in CI/dev is
   untouched and Tier B cannot newly activate (and redden) on a box that has `playwright` in the
   repo cwd but no chromium binary

**Deterministic total: 2+1+22+2+3+44+1 = 75 ✓ (≥ 75; +14 conditional Tier B).**

### 3.2 (b) tests-first design — resolve playwright from the target project's cwd
New `drive.js` resolution (single place, lazy as today):
`require.resolve('playwright', { paths: [process.cwd()] })` first → fallback to plain
`require.resolve('playwright')` (covers a dev box where it resolves globally) → else exit 1 with
`{ ok:false, error }` whose message names BOTH steps: `npm install -D playwright` and
`npx playwright install chromium` (run *in the target project*).

**Load-bearing invariant (architect):** the cwd-paths resolve MUST be attempted BEFORE the plain
fallback. If the order flips, the stub bite (check 1) is defeated on any box where playwright is
resolvable from the plugin dir — the real package would shadow the cwd stub.

The 3 new deterministic, zero-dep checks (all written and shown **RED against the old drive.js**
before the fix lands):
1. **Stub-resolution bite (behavioral):** the gate writes a temp dir containing
   `node_modules/playwright/` whose stub `chromium.launch()` throws a `FIXKIT_STUB_PLAYWRIGHT_LOADED`
   marker, then runs `lib/drive.js --url file:// --measure console` with `cwd` = that temp dir.
   PASS iff the output error carries the marker (proving the runner loaded *the cwd's* playwright).
   Old behavior fails this on every machine: plain `require('playwright')` never sees the temp cwd.
2. **Resolution-source + ordering assertion:** `drive.js` source contains the cwd-paths resolution
   (`{ paths: [process.cwd()] }`) AND it appears textually BEFORE any plain
   `require.resolve('playwright')` fallback — guards both against silent regression to plain require
   and against the order flip that would defeat check 1.
3. **Error-message contract:** the absent-playwright error string in `drive.js` includes
   `npm install -D playwright` (the QUICKSTART step the NODE_PATH remediation used to patch over).

### 3.3 Zero-dropped-checks accounting (the diff, not the count)
| Harness check (34) | Fate in the merged gate |
|---|---|
| §1 measures unit — 22 | moved verbatim (merged §3) |
| §2 contract — 2 | moved verbatim (merged §4) |
| §3 `>=1 skill` — 1 | **superseded (stricter)** by web's `>=4 skills` over the 6-skill union |
| §3 browser-drive per-skill linters — 4 | re-emitted identically by web's linter loop over browser-drive |
| §3 `>=1 user-invocable:false` — 1 | web's same check (browser-drive now counts toward it) |
| §3 browser-drive evals — 3 | re-emitted identically by web's eval loop |
| §4 4-key sync (harness plugin) — 1 | **dies with the plugin** — its subject no longer exists; web's 4-key sync remains |
| Tier B smoke — 14 conditional | moved verbatim, paths updated |

## 4. Commits (conventional, on `phase-1/merge-web-harness`)
1. `refactor(web)!: fold shipwithai-fixkit-web-harness into shipwithai-fixkit-web (0.3.0)` —
   all of §1 + §2 + §3.1 (gate merged, sections 1-4,6-8), marketplace entry removed, 4-key 0.3.0,
   wrong-org URL fixes, CHANGELOG, README migration note. Gate green (72 deterministic at this point).
2. `fix(web): resolve playwright from the target project cwd (tests-first)` — adds the 3 checks of
   §3.2, with the RED run against old drive.js captured in the commit body / execution log, then the
   drive.js fix; gate green at 75.
3. `docs(quickstart): install list drops to 2 plugins; remove the NODE_PATH remediation` — only after
   commit 2 is green.
4. `ci(publish): guard the detect step against deleted plugin manifests` (Ethan's deviation ruling) —
   minimal guard in `.github/workflows/publish-plugin.yml` detect step ONLY (existence-check or read
   via `git show HEAD:<path>`); zero change to publish logic. Effective at merge time because the
   push-triggered workflow runs the workflow file at the merge commit.

## 5. Acceptance (evidence, not assertions — handoff §4)
1. Core gate = **99 ✓ unchanged**; combined web gate exit 0 with **≥ 75 checks** including the 3 new
   (b) checks; core stub-adapter lifecycle tests still pass.
2. `grep -rn "web-harness" --include="*.md" --include="*.json" --include="*.js" .` → output equals
   the **known-historical manifest exactly** (critic ruling — mechanical pass/fail, no judgment):
   allowed hits are ONLY (i) this PLAN.md, (ii) `web/CHANGELOG.md` lines inside the pre-existing
   `[0.2.0]` entry and inside the appended "Historical — shipwithai-fixkit-web-harness (pre-merge)"
   section (the 0.3.0 entry MAY also name the merge — that line names the plugin being removed and
   is part of the manifest). Zero hits anywhere else. The exact file:line manifest is pasted as
   acceptance evidence.
3. `grep -rn "github.com/shipwithai/" plugins/shipwithai-fixkit-web/` → zero.
4. 4-key sync proven by pasting all four version values (= 0.3.0); root marketplace has NO harness entry.
5. `git diff main -- plugins/shipwithai-fixkit-core/lib/` → empty (trust anchor untouched).
6. Branch left unmerged and unpushed for Ethan's PR.

## 6. Risks / notes
- **Tier B on this machine:** playwright doesn't resolve here (baseline run SKIPped Tier B), so the
  smoke stays SKIP — green never depended on it (split-gate ruling preserved).
- **Gate now writes a temp dir** (the §3.2 stub) under `os.tmpdir()` — cleaned up in a `finally`;
  the gate stays zero-dependency (fs + child_process only).
- **Installed-plugin path caveat (pre-existing, unchanged):** SKILL/CONNECTORS examples use the
  repo-layout path `plugins/shipwithai-fixkit-web/lib/drive.js`; a `${CLAUDE_PLUGIN_ROOT}` form is a
  follow-up, not bundled here (kept mechanical: only the plugin-name segment changes).
- **Focus pack re-pin** is MANDATORY after this merges (plugin-version change) — separate session,
  per handoff §5. (Architect verified: the focus pack pins core + web only, never web-harness, and
  carries no drive.js path strings — coupling is bounded to the SHA re-pin.)
- **Publish workflow (resolved by commit ④ — Ethan's deviation ruling):** after merge,
  `publish-plugin.yml`'s detect step (`git diff HEAD~1` over `plugins/**/.claude-plugin/plugin.json`)
  will also list the DELETED harness plugin.json; unguarded, `json.load(open(...))` on the deleted
  path throws and could mask the web 0.3.0 publish. Squash-merge does NOT avoid this
  (critic-verified). Commit ④ guards the detect step in THIS branch — effective immediately at merge,
  since the push-triggered workflow executes the workflow file at the merge commit. Guard is
  minimal: detect step only, publish logic untouched.

## 7. What this plan does NOT do
No push / no merge to `main` / no publish · no core or trust-anchor edits · no focus-pack or
stub-adapter edits · no new measures, no renaming of the 6 measures or 5 UI LAYER_METHOD codes ·
no Playwright vendoring (still a documented prerequisite, now installed in the *target project*).
