# Connectors — backend adapter mappings

Core references capabilities by `~~category` placeholder (see core `CONNECTORS.md`). This adapter
maps each placeholder to a concrete **backend tool** with alternatives. The `## If <connector>
Available` idiom lets a recipe upgrade when the connector is present and degrade gracefully when
it is absent.

| Placeholder | Backend tool (primary) | Alternatives |
|---|---|---|
| `~~test-runner` | `npm test` | `vitest`, `jest`, `pytest`, raw `node <file>` exit code |
| `~~ci` | GitHub Actions | local shell build/run |
| `~~monitoring` | structured stdout/stderr boundary logs | Sentry-class MCP, log files |
| `~~runtime` | local service / dev server | container, in-process handler harness |
| `~~source control` | git + GitHub | local `git` |

## If ~~test-runner Available
Run the Logic proof via `npm test` (or vitest/jest/pytest, or `node <file>` like the stub fixtures).
The previously-failing test passing + the full suite green is what makes **Logic FULL**.

## If ~~ci Available
Run / read the System proof through the pipeline (GitHub Actions): a green pipeline is part of the
System proof. Without it, fall back to a local shell build/run plus instrumented-boundary logs.

## If ~~monitoring Available
Read structured logs / traces to confirm the instrumented boundary now carries the correct value
(`instrumented-boundary` evidence). Without a monitoring MCP, fall back to stdout/stderr log lines.

## If ~~runtime Available
Stand up the live service on its canonical port (see `backend-environment`). Without it, invoke the
handler in-process (the stub-fixture pattern) and note that full-stack recipes need a live runtime.

## If ~~source control Available
Use git + GitHub for diffs and history. A bug is **never** closed on a source diff alone — the diff
locates the change; the test/boundary proof confirms it.

## UI is refused
This adapter declares **UI = NONE** (`lib/capability.json`). It maps no `~~browser` connector; a
UI-symptom bug is re-routed at triage to a UI-capable adapter (doc 09 §6).

## What this does NOT do
- It does not bind any MCP server in code — the host wires the concrete connector; this file declares
  the mapping only.
- It does not grant a capability tier on its own; `lib/capability.json` declares the tiers.
- It does not re-implement the ledger, the verification matrix, or any guard — those are core's.
