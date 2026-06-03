# Connectors (`~~category` placeholders)

Core is platform-agnostic. It references capabilities by **category placeholder**; an adapter maps
each placeholder to a concrete tool/MCP server in its own `CONNECTORS.md`. Core ships only generic
defaults. The `## If <connector> Available` idiom lets a skill upgrade behaviour when a connector
is present and degrade gracefully when it is not.

| Placeholder | Used for | Generic default (core) |
|---|---|---|
| `~~runtime` | running the code (server / device / emulator) | local process / shell |
| `~~test-runner` | executing tests and assertions | `node <file>` exit code (the stub fixture) |
| `~~ci` | pipeline, build, deploy logs | local shell build; no remote CI |
| `~~browser` | observing the rendered UI (computed-style / DOM / console) | none in core — UI verification is ASSIST without it |
| `~~source control` | git operations, diffs | local `git` |
| `~~monitoring` | logs, metrics, traces | local stdout/stderr only |

## Capability implications

- A layer is **FULL** only when the connectors its proof needs are present (e.g. UI FULL needs
  `~~browser`; Logic FULL needs `~~test-runner`).
- Missing the required connector downgrades the layer to **ASSIST**: the agent emits `handoff/v0`
  and the ledger stops at `candidate` (never `closed`).
- Phase 0 wires only `~~test-runner` (the stub fixture). `~~browser`, real `~~ci`, and
  `~~monitoring` arrive with the Phase-1+ adapters.

## What this does NOT do

- It does not bind any real MCP server — those bindings live in adapter plugins, not in core.
- It does not grant a capability tier; it only declares what each placeholder is for.
