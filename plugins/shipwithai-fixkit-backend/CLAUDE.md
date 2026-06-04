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
