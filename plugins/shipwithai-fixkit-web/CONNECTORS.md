# Connectors — web adapter mappings

Core references capabilities by `~~category` placeholder (see core `CONNECTORS.md`). This adapter
maps each placeholder to a **concrete web tool** with alternatives. The `## If <connector>
Available` idiom lets a recipe upgrade when the connector is present and degrade gracefully when
it is absent.

| Placeholder | Web tool (primary) | Alternatives |
|---|---|---|
| `~~browser` | **web-harness Playwright runner** (in-loop, auto-close) — `node plugins/shipwithai-fixkit-web-harness/lib/drive.js` | Claude in Chrome / Cowork live-DOM (final spot-check), Playwright MCP |
| `~~runtime` | `astro dev` on `http://localhost:4321` | `vite preview`, `astro preview` |
| `~~test-runner` | `node <file>` exit code | `vitest` |
| `~~ci` | GitHub Actions | local shell build |
| `~~source control` | git + GitHub | local `git` |

## If ~~browser Available
**Primary: the web-harness Playwright runner** (`shipwithai-fixkit-web-harness`, in-loop, no human in
the inner loop). Drive the rendered page via
`node plugins/shipwithai-fixkit-web-harness/lib/drive.js --url <url> --measure <type> [opts]`: it reads
`getComputedStyle`, measures `scrollWidth`/`clientWidth`, reads the console, runs interaction + state
assertions, and sweeps the viewport matrix — emitting one UI `LAYER_METHODS` method
(`browser-assertion`/`computed-style`/`dom-assertion`/`console-assertion`/`interaction-assertion`) with
the observed numbers as `verification.evidence`. This is what makes **UI FULL autonomous** — the bug
closes on a live measurement, never a source diff. Record `verified_by` as the layer-agent + runner
(e.g. `ui-bug-agent (web-harness/playwright)`).

**Final spot-check (demoted): Claude in Chrome / Cowork live-DOM.** Once the harness has closed the
bug, an optional real-environment spot-check in a real Chrome confirms it in a human-facing browser. It
is **not** the primary UI proof and is never required to close.

## If ~~browser NOT Available
With neither the harness runner nor a live Chrome, the UI layer **downgrades to ASSIST**. `web-verify`
does not auto-close; it emits a `handoff/v0` (core `lib/handoff.schema.md`) carrying the exact target,
steps, and a UI `LAYER_METHODS` assertion for a provider (Cowork, a human, or a CI snapshot) to
observe. The ledger stops at `candidate`. **UI FULL requires `~~browser`** — now satisfiable in-loop by
the harness (install its prerequisite: `npx playwright install chromium`).

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
