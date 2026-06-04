# Phase-1 acceptance gate — evidence

> Companion to `PLAN.md`. Records the Phase-1 gate results across the three repos. CC-completable
> items are verified with fresh evidence; live-UI closure of Bug 3/4 is Cowork's documented handshake.

## Build gates (all green)
| Gate | Command | Result |
|---|---|---|
| engine core | `node plugins/shipwithai-fixkit-core/tests/run-all.js` | **PASS — 78 checks** (was 67; +6c hard-lock incl. defense-in-depth on verify/close, +6d handoff) |
| engine web adapter | `node plugins/shipwithai-fixkit-web/tests/run-all.js` | **PASS — 34 checks** |
| focus pack | `node plugins/shipwithai-fixkit-pack/tests/run-all.js` (in focus repo) | **PASS — 37 checks** |

## The three bugs (oracle mode — engine reproduced conclusions independently)

| Bug | Terminal state | Evidence |
|---|---|---|
| **Bug 1** — ArticleHero `--no-image` 96px gap | **`escalated`** ✅ | `.fixkit/BUG-001-…md`: `root_cause_layer=upstream` (organism additive padding 64px + lead margin 32px); routed to gap-log `drafts/V0.28-STREAM-C-GAPS.md`; **zero consumer `src/` edits + zero `@shipwithai/design` edits** (verified). `validateLedger` ACCEPTS the escalated ledger. The bug is never "fixed". |
| **Bug 3** — code-block overflow | **`candidate`** → awaiting Cowork | `.fixkit/BUG-003-…md` + `handoff/v0` `.fixkit/handoffs/BUG-003.handoff.json` (computed-style: `scrollWidth ≤ clientWidth` at 1280/768/375). Consumer fix present in `CodePreviewSnippet.astro`. ASSIST → `ASSIST_CANNOT_CLOSE` until Cowork measures the live DOM. |
| **Bug 4** — ReactionsBar dead + storage errors | **`candidate`** → awaiting Cowork | `.fixkit/BUG-004-…md` + `handoff/v0` `.fixkit/handoffs/BUG-004.handoff.json` (interaction-assertion + console clean). Fix: wired `initReactionsBar` in `BlogPostPage.astro` client `<script>`; deleted dead `src/components/reactions/ReactionBar.tsx`. ASSIST until Cowork verifies on the live DOM. |

**Live-UI handshake (the next HALT):** CC cannot observe the running DOM (no Chrome). The two
`handoff/v0` requests above are the verification requests; **Cowork measures the live DOM via Chrome,
writes `verification.evidence` + sets `verified_by`, and advances each ledger `candidate → verified →
closed`.** Path: reproduce on prod → verify on local dev `:4321` → prod re-check after deploy.

## Negative tests
1. **Hard-lock blocks pre-fix** ✅ executable. A fix stripping `data-surface` → `hard_lock_violations:
   ["data-surface"]` → `applyTransition('enter_fixed')` **REFUSED** (`HARD_LOCK_VIOLATION`), state
   stays `diagnosed`. Proven in core gate 6c via control-pair assertions (clean list → allowed;
   violation → refused on enter_fixed/enter_candidate/enter_verified/close) and confirmed by a manual
   mutation (neutering the guard turns the gate red), and through the adapter path
   (`/tmp/fixkit-neg-tests.js`).
2. **UI bug cannot close on a source diff** ✅ executable. A UI ledger whose proof `method` is
   `source-diff` → `validateLedger` **REJECTS** (`VERIFICATION_LAYER_MISMATCH`); control: a UI bug
   with `computed-style` proof is ACCEPTED. Fires through the adapter path (UI uses
   `LAYER_METHODS.UI`).
3. **Install integrity** — documented procedure (sha is the interim `PENDING-phase1-engine-commit`):
   - Focus install: `shipwithai-fixkit-focus/.claude-plugin/marketplace.json` lists **3 plugins** —
     the local pack (`source: "./plugins/shipwithai-fixkit-pack"`) + the pinned engine **core** and
     **web** (`source:{git-subdir,url:file://…,path,ref:main,sha}`). Installing from focus yields
     **pack + pinned engine (core+web) together**.
   - Engine standalone: the engine repo's own `.claude-plugin/marketplace.json` uses self-relative
     `source` (`./plugins/shipwithai-fixkit-core`, `./plugins/shipwithai-fixkit-web`) and installs
     **without** the focus repo.
   - Check at PR-out: replace `sha` with the engine Phase-1 commit; assert `installed engine commit
     == pinned sha`; later migrate `url` to the GitHub form.

## Consumer build (mechanical, CC-side)
`npm run build` in `shipwithai.io` (branch `phase-1/fixkit-bugs`): **43 pages rendered** — including
the blog pages that use the modified `BlogPostPage.astro` — with **no import-resolution error** for the
new `initReactionsBar` client `<script>` (the Bug-4 fix bundles clean). The build's only failure is
**pre-existing and unrelated to Phase 1**: `__dirname is not defined` in `astro-og-canvas`/
`canvaskit-wasm` during OG-image generation (`src/pages/og/[...slug].ts`) — the toolchain suggests
`pnpm add canvaskit-wasm`. Not a fix-loop concern; flagged for the consumer team.

## Verification helpers
`shipwithai-fixkit-focus/plugins/shipwithai-fixkit-pack/packs/shipwithai/verify-snippet.js` —
`measureOverflow` (Bug 3), `measureGap` (Bug 1), `reactionState` (Bug 4) — pasteable into Chrome by
Cowork; the returned object becomes the ledger evidence.
