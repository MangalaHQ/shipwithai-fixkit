---
name: backend-reproduce
description: "Backend reproduce recipes: Logic = a failing test written first; System = reproduce in the failing env and instrument the boundaries. UI refused. Internal: engine reproduce step."
version: 0.1.0
license: MIT
user-invocable: false
---

# backend-reproduce — trigger the failure on a runnable backend

The backend adapter's reproduce recipes. The engine (core's spine, REPRODUCE phase) calls these to
trigger a backend failure **reliably** on the target from `backend-environment`. Pick the recipe by
the triaged symptom layer. This adapter covers **Logic** and **System** only.

## Logic — a failing automated test (write it first)
Author the smallest test that asserts the intended behaviour; run it against the current code so it
**fails on the bug**. The failing run IS the reproduction (method analog: `failing-test-passes`
once green). Use `~~test-runner` (`npm test` / vitest / jest / pytest / `node <file>`).

```js
// illustrative: assert the intended output; this FAILS on the bug
const assert = require('assert');
const { compute } = require('../src/compute');
assert.strictEqual(compute(5), 15); // reproduced when this throws
```

## System — reproduce in the failing env + instrument the boundaries
Reproduce in the env that fails, then **log at the seam before touching code**: the request/response
edge, the queue, the DB call. The wrong value appearing in the boundary log IS the reproduction
(method analog: `instrumented-boundary`).

```js
// illustrative: capture the boundary record, then assert it
const log = [];
handleAtBoundary({ method: 'GET', path: '/api/x/' }, log);
console.log(log[0]); // reproduced when log[0] disagrees with intent
```

## UI — refused (capability NONE)
This adapter declares **UI = NONE** (`lib/capability.json`). A UI-symptom bug is **not accepted**
here; return to triage so the orchestrator re-routes it to a UI-capable adapter (doc 09 §6).

## What this skill does NOT do
- It does not diagnose or fix — it only triggers and records the failure (core's spine does the rest).
- It does not pick which proof counts at close (core's `verification`) or stand up the env.
- It does not handle UI bugs; UI is refused and re-routed at triage.
