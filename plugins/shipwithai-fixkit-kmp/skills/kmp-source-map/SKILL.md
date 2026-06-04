---
name: kmp-source-map
description: "Symptom -> file hints on a KMP tree: commonMain (shared) vs androidMain/iosMain; expect/actual seams; wrong on both platforms => shared, one => platform. Internal: engine isolate step."
version: 0.1.0
license: MIT
user-invocable: false
---

# kmp-source-map — map a KMP symptom to likely source files

The KMP adapter's source-map hints. The engine (core's spine, ISOLATE phase) uses these to narrow a
KMP symptom to the files most likely at fault, at a **generic** level — org- or framework-specific
maps live in packs, not here.

## The KMP source-set ladder
A KMP tree splits code by **source set**. Walk it by where the symptom appears:

1. **`commonMain`** — shared logic: models, use-cases, formatters, repositories' shared contracts.
   Symptoms: wrong computed value / state on **every** platform — usually a **Logic** bug.
2. **`androidMain` / `iosMain`** — platform implementations + the view layer (Compose / SwiftUI).
   Symptoms: wrong render/behaviour on **one** platform only — usually a **UI** bug (ASSIST here).
3. **Build / config** — `build.gradle.kts`, version catalogs, `expect`/`actual` wiring.
   Symptoms: build/dependency/config failure — usually a **System** bug.

## The decisive rule
**Wrong value on both platforms ⇒ the bug is shared (`commonMain`); wrong on one platform ⇒ it is in
that platform source set.** This single observation localizes most KMP bugs before reading code.

## `expect`/`actual` seams
An `expect` declaration in `commonMain` with `actual` implementations per platform is a frequent
fault line: a shared call site but divergent platform behaviour points at the `actual` that differs.
Check the `actual` on the failing platform first.

## Symptom → source-set hints
- Wrong total / format / state on Android **and** iOS → `commonMain` (rung 1), Logic.
- Layout/interaction wrong on one platform's screen → that platform's view layer (rung 2), UI/ASSIST.
- Build, dependency resolution, or `expect`/`actual` mismatch → build/config (rung 3), System.

## What this skill does NOT do
- It does not reproduce, fix, or verify — it only suggests where to look.
- It does not encode org- or framework-specific file layouts; those belong to a pack overlay.
- It does not observe the running UI; localizing a platform UI bug still routes to an ASSIST handoff.
