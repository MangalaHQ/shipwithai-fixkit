---
name: web-source-map
description: "Symptom -> file hints on an Astro + content-collections stack: overflow, dead interaction, layout gap, content-not-updating. Used internally by the engine's isolate step on a web bug."
version: 0.1.0
license: MIT
user-invocable: false
---

# web-source-map — symptom → likely file on an Astro stack

The web adapter's isolation aid. The engine (core's spine, ISOLATE phase) uses these hints to
narrow a reproduced web symptom to the **likely source location** on a generic Astro +
content-collections stack. These are *starting points*, not a diagnosis — DIAGNOSE still traces the
bad value to its origin before any fix (the Iron Law holds).

## The mapping

| Symptom (reproduced) | Likely location | What to inspect |
|---|---|---|
| **Overflow** (scrollWidth > clientWidth) on a code block / prose | `pre` / prose CSS | `white-space`, `overflow-x`, `max-width`, `word-break` on `pre`/`code`; the `.prose` typography rules; global content styles |
| **Dead interaction** (click/handler does nothing) | missing `client:*` hydration **or** an unwired behavior script | the island's `client:load`/`client:visible` directive (an un-hydrated island ships no JS); the event-listener wiring in the component's script |
| **Layout gap / wrong spacing** | component spacing / variant CSS | the component's margin/padding/gap; the variant or prop that selects spacing; layout wrapper / slot styles |
| **Content not updating** (edit doesn't show) | content-collections cache | `.astro/` generated content cache; the collection schema/loader; a `file:`-linked package's stale cache (see `web-environment`) |

## How to use a hint
1. Start at the mapped location; confirm it is on the path the reproduction exercises.
2. If the symptom is **content not updating**, rule out a **cache** cause first (clear `.astro/`,
   restart, hard-refresh per `web-environment`) before editing source — a stale cache mimics a
   code bug.
3. A dead interaction is most often a **missing hydration directive**, not a logic bug: confirm the
   island actually ships JS (`client:*`) before debugging the handler.
4. Hand the narrowed surface back to DIAGNOSE. Do not fix from a hint alone.

## What this does NOT do
- It does not diagnose or fix — it only suggests where to look; DIAGNOSE finds the real root cause.
- It does not stand up the server (`web-environment`), reproduce (`web-reproduce`), or verify
  (`web-verify`).
- It is **generic web level** — it encodes no specific app's routes or org-specific file layout.
- It does not classify the symptom layer (core's `triage` does).
