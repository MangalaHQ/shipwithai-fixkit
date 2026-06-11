# CLAUDE.md — shipwithai-fixkit-web

Runtime guidance for working inside the **web adapter**. Conforms to the fixkit family
conventions (ADR-0001). The engine it adapts is `shipwithai-fixkit-core`.

## What an adapter is (design-doc 09 §9)
An adapter is **thin**: it supplies *mappings*, *recipes*, and *declarations* only. The
debugging discipline, the layer-agents, the ledger state machine, and the orchestrator all live
in **core**. This plugin never re-implements any of them — it tells core *how* to do its work on
a concrete web stack.

## What this adapter supplies
- **Connector mappings** (`CONNECTORS.md`): each core `~~category` placeholder → a concrete web
  tool, with alternatives, via the `## If <connector> Available` idiom.
- **Capability declaration** (`lib/capability.json`): UI / Logic / System = FULL on this stack.
- **Per-layer recipes** (skills): `web-reproduce` (reproduce recipes), `web-verify` (verify recipes
  mirroring reproduce), `web-environment` (stand up the target), `web-source-map` (symptom → file hints),
  and `astro-recipes` (generic Astro UI-render fix patterns).
- **The bundled `~~browser` runner** (since 0.3.0, when the standalone harness plugin was folded in):
  `lib/drive.js` (thin headless Playwright runner) + `lib/measures.js` (the pure shaping helpers) +
  the `user-invocable:false` sub-skill `browser-drive` documenting the CLI contract. It observes a
  live page and emits one of the five UI `LAYER_METHODS` with observed numbers as evidence — pure
  mechanism, no debugging logic.

## Framework-module contract (the seam)
This adapter is organized around `lib/framework-module.contract.md` — a **doc** (no code) that splits
the adapter into two non-overlapping halves. A second framework (Step 2) reuses the spine and
re-implements the module.

- **Platform spine — framework-AGNOSTIC:** `web-reproduce` + `web-verify` only (plus `CONNECTORS.md`,
  `lib/capability.json`, and `handoff/v0` emission). These reference *the active framework module's*
  `runtime` / `source-map` / `recipes` — never Astro by name.
- **Astro framework module (first impl):** `web-environment` = the `runtime` slot, `web-source-map` =
  the `source-map` slot, `astro-recipes` = the `recipes` slot. These MAY name Astro concretely — that is
  their job. (`web-environment`'s port-hygiene sub-part is a Step-2 extraction candidate into a shared
  runtime helper; it stays whole here.)

`astro-recipes` is **framework-generic, not org-specific** — it carries no design-system import path or
named organism; an external overlay pack adds that specialization on top of the `recipes` slot.

## The stack this adapter targets
Astro + content-collections, served by `astro dev` on the canonical port **4321**. Live-UI proof
runs through `~~browser` — primary: the bundled Playwright runner (`lib/drive.js`, in-loop);
Claude in Chrome / Cowork live-DOM is a final spot-check only. Logic proof runs through
node/vitest; System proof through the shell / GitHub Actions.

## The bundled runner (config profile + security)
- **Invocation:** `node plugins/shipwithai-fixkit-web/lib/drive.js --url <url> --measure <type>
  [opts]` → one JSON line `{ method, ok, evidence }`; failure exits non-zero with
  `{ ok:false, error }` and NO `method` (a failed observation is never proof).
- **Config profile (not hardcoded in the skill):** viewport matrix default `1280,768,375`
  (`--widths`); navigation/interaction timeout default `15000` ms (`--timeout`); console settle
  `--wait` default `500` ms; headless Chromium, `{ headless: true }`, no remote debugging port.
- **Prerequisite (documented, not vendored):** `playwright` + a Chromium binary, installed **in the
  target project** (`npm install -D playwright` then `npx playwright install chromium`) — the
  runner resolves `playwright` from the invoking cwd. No `package.json` here; the repo stays
  zero-dependency.
- **Security note:** the runner **executes target code** (launches a browser, loads a page). It is
  bounded to `--url`/`--selector` inputs, launches headless with no exposed debug port, and edits
  no source. Treat any change to `lib/drive.js` or `manifest.json` as security-review scope.

## Capability tiers (and the ASSIST downgrade)
`lib/capability.json` declares UI/Logic/System = FULL — but **UI FULL requires `~~browser`**.
When no browser connector is wired, the UI layer downgrades to **ASSIST**: `web-verify` does not
auto-close; it emits a `handoff/v0` (core `lib/handoff.schema.md`) whose `assertion.method` is a
UI `LAYER_METHODS` proof, and the ledger stops at `candidate`.

## Mirror principle
**Verification mirrors reproduction.** Every recipe in `web-verify` re-runs the same observation
`web-reproduce` used to trigger the failure — same target, same measurement — now asserting the
fixed result. A reproduce-by-`scrollWidth` bug is verified by `scrollWidth`, never by a diff.

## Conventions (BLOCKING in `tests/run-all.js`)
`SKILL.md` < 200 lines · max inline code block ≤ 20 lines · `description` < 200 chars · every
skill ends with `## What this … does NOT do` · ≥ 1 `user-invocable:false` sub-skill · ≥ 5 evals
per skill (≥ 3 trigger / ≥ 2 must-not) · 4-key version sync (`plugin.json` == per-plugin
`marketplace.json` top == `plugins[0]` == root marketplace web entry).

## Run the gate
`node tests/run-all.js` (run from the repo root, not this dir — the repo hooks use a
project-relative path). Exit 0 = green. Since 0.3.0 the gate also carries the former harness
checks: the `measures.js` unit test (methods pinned to core `LAYER_METHODS.UI`), the cross-plugin
contract test against core `validateLedger`, and the conditional Tier-B Playwright smoke — Tier B
SKIPs when `playwright` is absent (plain `require.resolve` probe, deliberately not cwd-aware) and
the gate's green NEVER depends on it.

## What this plugin does NOT do
- It ships **no debugging logic, no layer-agents, and no orchestration** — those are core's.
- It does not re-implement the ledger, the Iron Law, or the state machine; it only references them.
- It does not bind any MCP server in code; `CONNECTORS.md` declares the mappings, the host wires them.
- It does not close a UI bug without `~~browser`; absent it, the layer is ASSIST and emits handoff/v0.
- Its runner does not classify bugs, choose the proof method, stand up the server, or close the
  ledger; and it does not vendor Playwright or add a package manifest.
