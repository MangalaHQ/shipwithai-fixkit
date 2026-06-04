---
name: backend-source-map
description: "Symptom -> file hints on common backend stacks: route/handler -> service/use-case -> data layer. Generic only; org specifics belong to packs. Internal: engine isolate step on a backend bug."
version: 0.1.0
license: MIT
user-invocable: false
---

# backend-source-map — map a backend symptom to likely source files

The backend adapter's source-map hints. The engine (core's spine, ISOLATE phase) uses these to
narrow a backend symptom to the files most likely at fault, at a **generic** level — org- or
framework-specific maps live in packs, not here.

## The generic backend request path
Most backend bugs sit on one of three rungs of the request path. Walk them outermost-in:

1. **Route / handler / controller** — request parsing, status codes, auth, input validation.
   Symptoms: wrong status, 4xx/5xx at the edge, request not reaching the service.
2. **Service / use-case / domain logic** — the computation, state transitions, business rules.
   Symptoms: wrong output, bad totals, incorrect state — usually a **Logic** bug.
3. **Data layer / repository / client** — queries, ORM mappings, external API/DB calls, queues.
   Symptoms: wrong/missing rows, serialization, integration edges — usually a **System** bug.

## Symptom → rung hints
- Wrong computed value / total / edge case → **service** (rung 2), Logic.
- 500 / timeout / wrong payload at an integration edge → **data layer** (rung 3), System.
- Wrong status / missing field at the request edge → **handler** (rung 1).
- Instrument the boundary between two rungs to localize which one emits the wrong value first.

## What this skill does NOT do
- It does not reproduce, fix, or verify — it only suggests where to look.
- It does not encode org- or framework-specific file layouts; those belong to a pack overlay.
- It does not map UI symptoms (UI = NONE for this adapter).
