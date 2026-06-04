# Connectors — web adapter mappings

Core references capabilities by `~~category` placeholder (see core `CONNECTORS.md`). This adapter
maps each placeholder to a **concrete web tool** with alternatives. The `## If <connector>
Available` idiom lets a recipe upgrade when the connector is present and degrade gracefully when
it is absent.

| Placeholder | Web tool (primary) | Alternatives |
|---|---|---|
| `~~browser` | Claude in Chrome (live-DOM / computed-style / console) | Playwright MCP, Puppeteer MCP |
| `~~runtime` | `astro dev` on `http://localhost:4321` | `vite preview`, `astro preview` |
| `~~test-runner` | `node <file>` exit code | `vitest` |
| `~~ci` | GitHub Actions | local shell build |
| `~~source control` | git + GitHub | local `git` |

## If ~~browser Available
Drive the rendered page directly: read `getComputedStyle`, measure `scrollWidth`/`clientWidth`,
read the console, run interaction + state assertions, sweep the viewport/resize matrix. This is
what makes **UI FULL** — the layer proof (`browser-assertion`/`computed-style`/`dom-assertion`/
`console-assertion`/`interaction-assertion`) is observed on the live page.

## If ~~browser NOT Available
The UI layer **downgrades to ASSIST**. `web-verify` does not auto-close; it emits a `handoff/v0`
(core `lib/handoff.schema.md`) carrying the exact target, steps, and a UI `LAYER_METHODS`
assertion for a provider (Cowork, a human, or a CI snapshot) to observe. The ledger stops at
`candidate`. **UI FULL requires `~~browser`.**

## If ~~runtime Available
Stand up the target with `astro dev` on the canonical port 4321 (see `web-environment` for cache
discipline and stale-server handling). Without it, fall back to a static `astro build` + preview;
note in the ledger that interaction recipes need a live runtime.

## If ~~test-runner Available
Run Logic proof via `node <file>` exit code (the `web-stub` fixture pattern) or `vitest`. This is
what makes **Logic FULL**.

## If ~~ci Available
Run / read System proof through GitHub Actions (pipeline-run, ci-run). Without it, fall back to a
local shell build and instrumented-boundary logs. This is what makes **System FULL**.

## If ~~source control Available
Use git + GitHub for diffs and history. A UI bug is **never** closed on a source diff alone — the
diff locates the change; the live proof confirms it.

## What this does NOT do
- It does not bind any MCP server in code — the host wires the concrete connector; this file only
  declares the mapping.
- It does not grant a capability tier on its own; `lib/capability.json` declares the tiers and the
  `~~browser` precondition gates UI FULL.
- It does not re-implement the handoff format — it references core's `lib/handoff.schema.md`.
