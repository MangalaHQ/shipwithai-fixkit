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
- **Per-layer recipes** (skills): `web-environment` (stand up the target), `web-reproduce`
  (reproduce recipes), `web-verify` (verify recipes mirroring reproduce), `web-source-map`
  (symptom → file hints on an Astro + content-collections stack).

## The stack this adapter targets
Astro + content-collections, served by `astro dev` on the canonical port **4321**. Live-UI proof
runs through `~~browser` (Claude in Chrome). Logic proof runs through node/vitest; System proof
through the shell / GitHub Actions.

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
project-relative path). Exit 0 = green.

## What this plugin does NOT do
- It ships **no debugging logic, no layer-agents, and no orchestration** — those are core's.
- It does not re-implement the ledger, the Iron Law, or the state machine; it only references them.
- It does not bind any MCP server in code; `CONNECTORS.md` declares the mappings, the host wires them.
- It does not close a UI bug without `~~browser`; absent it, the layer is ASSIST and emits handoff/v0.
