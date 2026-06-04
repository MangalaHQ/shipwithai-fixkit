---
name: backend-environment
description: "Stand up or locate the runnable backend target and enforce hygiene: env vars present, ports free, clean test DB/state, kill stale processes. Triggers: 'start the service', 'reset the test DB'."
version: 0.1.0
license: MIT
user-invocable: true
---

# backend-environment — make the backend runnable and clean

The backend adapter's environment skill. The engine (core's spine) calls this to get a
**runnable, clean** target before REPRODUCE. It locates or stands up the service via `~~runtime`
and removes the state that makes backend bugs flaky. It ships no debugging logic.

## Locate or stand up the target (`~~runtime`)
Find the service entrypoint (`npm start` / `npm run dev`, a `docker compose` service, or an
in-process test harness) and the canonical port. Prefer the smallest runnable surface that still
reproduces the bug (an in-process handler over a full server when possible).

## Environment hygiene (the backend equivalent of cache discipline)
- **Env vars:** confirm required vars are present and pointed at a *test* target, never prod.
- **Ports:** ensure the canonical port is free; kill stale listeners before starting.
- **State:** start from a clean test DB / fixture state so a stale row can't fake a pass or fail.
- **Processes:** kill orphaned watchers/servers from a previous run.

```bash
# illustrative hygiene sweep (adapt per stack; ~~runtime supplies the concrete commands)
lsof -ti tcp:3000 | xargs -r kill        # free the canonical port
: "${DATABASE_URL:?set a TEST DATABASE_URL}"   # fail loudly if env is missing
```

## If ~~runtime Available
Stand up the live service on its canonical port. Without it, fall back to invoking the handler
in-process (the stub-fixture pattern) and note in the ledger that full-stack recipes need a runtime.

## What this skill does NOT do
- It does not reproduce, diagnose, fix, or verify — it only makes the target runnable and clean.
- It does not classify the bug (core's `triage`) or map symptom→file (see `backend-source-map`).
- It does not touch production state; it refuses to operate against a non-test target.
