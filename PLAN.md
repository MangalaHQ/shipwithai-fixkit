# PLAN.md — Sprint 2: FE-developer quickstart (publish-readiness)

> **Branch:** `phase-1/fe-quickstart` off `main` @ `e9f58f9` · **Approver:** Ethan · **Status:** awaiting plan-in (ADR-0002 HALT).
> **Author:** Claude Code. Supersedes the Step-1.1 plan (preserved in git history, merged as PR #10).
> **Source brief:** CC handoff "Sprint 2: FE-developer quickstart" (Cowork, Session 7) — Sprint 2 of
> `../shipwithai-fixkit-design/14-SPRINT-PLAN.md`.
> **Deliverable this round:** this PLAN.md, then **HALT**. No production file edited until Ethan approves.
> **ZERO engine-core / adapter / harness change** — docs + a read-only dry-run only. `git diff` must show
> **nothing under `plugins/**`** (publish workflow must NOT fire).

---

## 0. Pre-verification (done before writing this plan, 2026-06-10)

Every command/name in the Cowork quickstart draft was checked against the actual repo:

| Claim in draft | Verified against | Result |
|---|---|---|
| `/plugin marketplace add MangalaHQ/shipwithai-fixkit` | `git remote -v` + `gh repo view` → `MangalaHQ/shipwithai-fixkit`, **PUBLIC** | ✅ |
| Marketplace name `shipwithai-fixkit` | root `.claude-plugin/marketplace.json` `"name"` | ✅ |
| Plugin names `-core` / `-web` / `-web-harness` (+ `@shipwithai-fixkit`) | root marketplace `plugins[]` | ✅ |
| `/shipwithai-fixkit-core:fix` | `plugins/shipwithai-fixkit-core/commands/fix.md` header | ✅ |
| `npx playwright install chromium` | web-harness `README.md:28` + `skills/browser-drive/SKILL.md:34` | ✅ |
| `capability_tier: FULL` | `lib/ledger.schema.md:23` (`FULL \| ASSIST \| NONE`) | ✅ |
| Integrity rule → `candidate` + `handoff/v0` (no fake close) | `commands/fix.md` steps 9/11 | ✅ |
| Proof shapes: interaction 0→1; overflow body sw 2443/cw 1280 → 1280/1280 | gate-run records + merged PR #10 framing | ✅ |
| Versions core 0.3.0 / web 0.2.1 / web-harness 0.2.0 | root marketplace.json | ✅ |
| `lib/pattern-miner.js` exists; `../shipwithai.io/.fixkit` mounted (5 BUG ledgers) | `ls` | ✅ both |

### ⚠️ Deviations from the handoff — need Ethan's ruling at plan-in

1. **Handoff Task 2's URL fix is a no-op on the root README.** The root `README.md` (55 lines)
   contains **no** `github.com/shipwithai/...` link. The wrong-org URLs actually live in **8 files
   under `plugins/**`**: the `"repository"` field of all 7 `plugin.json` files +
   `plugins/shipwithai-fixkit-web-harness/README.md:3`. The DoD forbids any diff under
   `plugins/**`, and `plugin.json` edits sit on the `publish-plugin.yml` path filter.
   → **Proposal: DEFER** the 8 URL fixes to each plugin's next version-bump PR; record as a
   follow-up in the completion report. This sprint changes no URL (nothing to fix in scope).
2. **Root README has Phase-0-era drift** (same file as the cross-link task, docs-only): it claims
   the five adapters "are intentionally not present yet" and its repo-layout tree shows only
   `core`. → **Proposal: fix minimally** while in the file (exact diff in Task 2). Decline = drop
   step 2.3; the cross-link stands alone.
3. **`.claude/agents/drift-monitor.md` has no pin reference today** — handoff Task 3 is therefore
   an **addition** of a pin note, not an update (proposed text in Task 3).

---

## 1. Tasks

### Task 0 — Branch + plan commit
- [ ] 0.1 `git checkout -b phase-1/fe-quickstart e9f58f9`
- [ ] 0.2 `git add PLAN.md && git commit -m "docs(phase-1): PLAN.md — Sprint 2 FE quickstart"`
      (do **not** add the stray untracked `SHA` file at repo root — not ours).

### Task 1 — `docs/QUICKSTART-FE.md` (create)
- [ ] 1.1 Create with the Cowork §2 draft **verbatim except one wording fix**: step-3 sentence
      "…applies the fix, and VERIFIEs on the same measurement" → "…applies the fix, and re-runs
      the same measurement to VERIFY". All commands, plugin names, proof numbers, and the
      integrity-rule paragraph stay exactly as drafted (all verified in §0). Full final content:

````markdown
# Quickstart — fix front-end bugs on your Astro project

`shipwithai-fixkit` is a bug-fix engine for Claude Code: it classifies a bug by the layer its
symptom lives in, debugs on a systematic spine, and **closes only on measured browser proof** —
a rendered bug never closes on a source diff.

## Prerequisites
- Claude Code installed, Node 18+
- An Astro project that runs locally (`npm run dev`)

## Install (one time)
In Claude Code:

    /plugin marketplace add MangalaHQ/shipwithai-fixkit
    /plugin install shipwithai-fixkit-core@shipwithai-fixkit
    /plugin install shipwithai-fixkit-web@shipwithai-fixkit
    /plugin install shipwithai-fixkit-web-harness@shipwithai-fixkit

Then install the harness browser (a prerequisite, not vendored):

    npx playwright install chromium

## Fix a bug
1. Start your dev server: `npm run dev`
2. In Claude Code, run:

       /shipwithai-fixkit-core:fix <describe the bug — symptom, page URL, what you expected>

3. The engine creates a ledger entry under `.fixkit/`, REPRODUCEs the bug with a live headless
   measurement, finds the root cause, applies the fix, and re-runs the same measurement to
   VERIFY. The bug closes at `capability_tier: FULL` only when the live number flips.

## What proof looks like (real runs)
- **Hydration bug** (component never becomes interactive): measure `interaction` —
  REPRODUCE `ok:false` (click count 0→0) → fix `client:load` → VERIFY `ok:true` (count 0→1).
- **Overflow bug** (a `<pre>` pushes the page sideways): measure `overflow` on the **page root** —
  REPRODUCE `ok:false` (body scrollWidth 2443 / clientWidth 1280) → fix `overflow-x:auto` →
  VERIFY `ok:true` (1280/1280). The `<pre>` keeps its own scrollbar by design.

## If something is missing
No Playwright/runner available? The engine will not pretend: the integrity rule stops auto-close,
the bug ends at `candidate` with a `handoff/v0` verification request instead of a fake `closed`.

License: MIT.
````

- [ ] 1.2 Commit: `docs(phase-1): QUICKSTART-FE — FE-developer quickstart for the Astro harness`

### Task 2 — README cross-link (+ drift fix per Deviation 2)
**File:** root `README.md` only.
- [ ] 2.1 Insert as its own paragraph right after the opening blockquote (after line 4):

  ```markdown
  **Front-end dev with an Astro project?** Start at [docs/QUICKSTART-FE.md](docs/QUICKSTART-FE.md).
  ```
- [ ] 2.2 URL fix: **none in this file** (Deviation 1 — deferred follow-up under `plugins/**`).
- [ ] 2.3 *(drop if Deviation 2 declined)* Replace the stale adapters paragraph (lines 24–25)
      with: `The five platform adapters (`web`, `backend`, `kmp`, `android`, `ios`) and the
      web-harness ship alongside the core; the ShipWithAI org pack lives in the sibling repo
      `shipwithai-fixkit-focus`.` — and in the repo-layout tree, change the single `plugins/` leaf
      to two lines: `├── shipwithai-fixkit-core/ # the engine` and
      `└── shipwithai-fixkit-{web,web-harness,backend,kmp,android,ios}/ # adapters + harness`.
- [ ] 2.4 Commit: `docs(phase-1): README — cross-link FE quickstart, refresh adapter layout note`

### Task 3 — drift-monitor pin note (addition)
**File:** `.claude/agents/drift-monitor.md`.
- [ ] 3.1 Append to the `## Context` → "Reads on startup" list:

  ```markdown
  - Cross-repo pin: focus `master` (`../shipwithai-fixkit-focus`) pins engine `main` @ `e9f58f9`
    (web 0.2.1) in **GitHub-URL form** (`MangalaHQ/shipwithai-fixkit`); migration off the interim
    `file://` pin is DONE (2026-06-10), verified by focus `check-engine-pins`. If engine `main`
    moves, flag the focus pin as drift — report only, never edit it.
  ```
- [ ] 3.2 Commit: `docs(phase-1): drift-monitor — record focus→engine pin (main @ e9f58f9, GitHub-URL form)`

### Task 4 — Pattern-miner dry-run (B-PAT scout, READ-ONLY)
No file created. **No playbook entry — that is Sprint 10.**
- [ ] 4.1 `node plugins/shipwithai-fixkit-core/lib/pattern-miner.js ../shipwithai.io/.fixkit --json`
      (ledger dir confirmed mounted, 5 BUG ledgers). Capture stdout.
- [ ] 4.2 Read-only proof: `git -C ../shipwithai.io status --short` unchanged by the run.
- [ ] 4.3 Report whether a real recurring pattern surfaces (plausible candidate: BUG-004/BUG-005
      both in ReactionsBar scope) — or SKIP + reason if the run errors.

### Task 5 — Gates
- [ ] 5.1 `cd plugins/shipwithai-fixkit-core && node tests/run-all.js` → exit 0.
- [ ] 5.2 `node plugins/shipwithai-fixkit-web-harness/tests/run-all.js` → exit 0.
- [ ] 5.3 `git diff main --stat -- plugins/` → **empty** (no bump, publish must not fire).

### Task 6 — Critic clean-room follow (worker ≠ grader)
- [ ] 6.1 Dispatch a **fresh critic subagent** (no access to this session's assumptions) to refute
      `docs/QUICKSTART-FE.md` by following it literally: re-resolve the marketplace add target
      (public repo by that exact name?), each `/plugin install` name + `@shipwithai-fixkit`
      suffix, the `/shipwithai-fixkit-core:fix` exposure in `commands/fix.md`, whether
      `npx playwright install chromium` is sufficient per the web-harness docs on a clean machine,
      and any hidden assumption a stranger would hit (Node version, dev-server port, `.fixkit/`
      creation).
- [ ] 6.2 Every deviation found = a doc fix, not a footnote: amend + re-run the critic until
      clean. Commit: `docs(phase-1): QUICKSTART-FE — critic fixes: <list>`.

### Task 7 — Completion report → HALT
- [ ] 7.1 Report: commit list, both gate outputs, empty-`plugins/` diff proof, critic verdict,
      pattern-miner findings (or SKIP reason), deferred wrong-org-URL follow-up. **Ethan reviews
      + pushes/PRs — CC never pushes.**

---

## 2. Definition of Done (handoff §4, re-scoped per Deviation 1)
- `docs/QUICKSTART-FE.md` committed; README cross-link in the same branch.
- Critic clean-room follow passed (or doc amended until it does).
- Both gates exit 0; `git diff` shows **NOTHING under `plugins/**`**.
- drift-monitor pin note current; pattern-miner dry-run output (or SKIP reason) in the report.
- Branch `phase-1/fe-quickstart`, conventional commits; Ethan reviews + pushes/PRs.

## 3. What this plan does NOT do
- No engine/adapter/harness code or version changes; **no edits under `plugins/**`** — including
  the 8 wrong-org `repository` URLs (deferred to per-plugin version-bump PRs).
- No playbook entry (Sprint 10); no consumer-repo (`shipwithai.io`) edits — BUG-005/GAP-A/GAP-B
  are separate threads.

## 4. Decisions needed from Ethan at plan-in
1. **Deviation 1** — defer the 8 wrong-org URLs under `plugins/**`? *(recommend: yes, defer)*
2. **Deviation 2** — include the minimal README adapters-paragraph drift fix (step 2.3)?
   *(recommend: yes, include)*
