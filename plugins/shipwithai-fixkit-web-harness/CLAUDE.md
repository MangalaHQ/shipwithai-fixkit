# CLAUDE.md — shipwithai-fixkit-web-harness

Runtime guidance for the **web harness** — the in-loop `~~browser` binding. Conforms to the fixkit
family conventions (ADR-0001). The engine it serves is `shipwithai-fixkit-core`; it is consumed by a
web adapter (e.g. `shipwithai-fixkit-web`) whose `CONNECTORS.md` resolves `~~browser` here.

## What this plugin is
A **pure mechanism** plugin: one thin Node Playwright runner (`lib/drive.js`) + the 5 shaping
helpers (`lib/measures.js`) + one `user-invocable:false` sub-skill (`browser-drive`) that documents
the CLI contract. It observes a live page and emits one of the five UI `LAYER_METHODS` with the
observed numbers as evidence. It carries **no** debugging logic, layer-agents, or orchestration —
those live in core.

## Why it exists
The web adapter declares UI `FULL` *conditional on `~~browser`*. Before this harness, that
precondition was only met by a human-driven Chrome (Cowork live-DOM), so CC alone fell back to
ASSIST → `candidate`. This harness satisfies `~~browser` **in-loop for CC**, so UI `FULL` becomes
real autonomously and a UI bug reaches `closed` on a live measurement (never a source diff).

## Config profile (NOT hardcoded in the skill)
- **Port / target:** the runner receives a `--url`; the adapter's `~~runtime` stands up the target
  (canonical `astro dev` on `http://localhost:4321`).
- **Viewport matrix:** default `1280,768,375` (override via `--widths`).
- **Timeouts:** navigation/interaction default `15000` ms (override via `--timeout`); console settle
  `--wait` default `500` ms.
- **Browser:** headless Chromium, launched with `{ headless: true }` and no remote debugging port.

## Prerequisite (documented, not vendored)
Playwright + a Chromium binary: `npx playwright install chromium`. This is a **prerequisite**, not a
repo dependency — there is no `package.json` and nothing is vendored (the repo stays zero-dependency).
The Tier-A gate runs without it; only the Tier-B smoke needs it (it SKIPs cleanly when absent).

## The gate (split gate)
`node plugins/shipwithai-fixkit-web-harness/tests/run-all.js` (from the repo root). Exit 0 = green.
- **Tier A (always, zero-dep):** `measures.js` unit test (method strings pinned to core
  `LAYER_METHODS.UI`), the cross-plugin contract test (a harness-shaped ledger PASSES core
  `validateLedger`; a drifted-method twin is REJECTED), convention + eval linters, 4-key version sync.
- **Tier B (conditional):** the live Playwright smoke over `evals/fixtures/smoke-page/` (broken/fixed
  polarity). SKIPs when Playwright is absent; the gate's green never depends on it.

## Conventions (BLOCKING in `tests/run-all.js`)
`SKILL.md` < 200 lines · max inline code block ≤ 20 lines · `description` < 200 chars · every skill
ends with `## What this … does NOT do` · ≥ 1 `user-invocable:false` sub-skill · ≥ 5 evals per skill
(≥ 3 trigger / ≥ 2 must-not) · 4-key version sync. **Skill count is `≥ 1`** (not the adapters' `≥ 4`):
this is a single-purpose mechanism plugin.

## Security note
This plugin **executes target code** (launches a browser, loads a page, drives a dev server). The
runner is bounded to `--url` + `--selector` inputs, launches headless with no exposed debug port, and
edits no source. Treat any change to `lib/drive.js`, `manifest.json`, or a future `.claude/hooks/`
as security-review scope.

## What this plugin does NOT do
- It ships no debugging logic, no layer-agents, and no orchestration — those are core's.
- It does not classify bugs, choose the proof method, stand up the server, or close the ledger.
- It does not vendor Playwright or add a package manifest; the host installs the prerequisite.
- It does not make a failed observation look like proof — a failure exits non-zero with no `method`.
