# Framework-module contract — the web adapter's framework seam

This is a **doc, not code** (the adapter stays zero-dependency). It defines the durable abstraction the
`shipwithai-fixkit-web` adapter is built around: a **platform spine** that is framework-AGNOSTIC, and one
or more **framework modules** that fill a fixed set of slots. The spine dispatches through the slots; it
never names a concrete framework.

Astro is the **reference (first) impl** of this contract. A second framework (e.g. Next.js) arrives in
Step 2 and fills the same slots — at which point the plugin may split / rename (out of scope here).

## The two halves of the adapter

- **Platform spine (framework-agnostic):** `web-reproduce`, `web-verify`, plus the declarations
  `lib/capability.json`, `CONNECTORS.md`, and `handoff/v0` emission. These reference *"the active
  framework module's runtime / source-map / recipes"* — never Astro by name. They are the part that a
  second framework reuses unchanged.
- **Framework module (Astro, first impl):** `web-environment` (runtime slot), `web-source-map`
  (source-map slot), and `astro-recipes` (recipes slot). These MAY name Astro concretely — that is their
  job. They are the part a second framework re-implements.

## The 5 slots

| Slot | Responsibility | Astro impl (Step 1) |
|---|---|---|
| `detect` | is this project framework X? + read its version | `astro.config.{mjs,ts}` present, or `astro` in deps; read the installed version |
| `runtime` (`~~runtime`) | stand up the target + cache discipline | `astro dev --port 4321`; clears `.astro/` + `node_modules/.vite`; `astro preview` fallback. **Today's `web-environment`.** |
| `source-map` | map a reproduced symptom → likely source file | the symptom→file table. **Today's `web-source-map`.** |
| `recipes` | generic framework fix patterns, each targeting a harness measure | the public `astro-recipes` skill (hydration / behavior-wiring / overflow). |
| `locate` (optional) | rendered DOM node → authoring source component | **reserved, NOT implemented.** Sprint 3 / B-LOC (`data-astro-source-*` / sourcemap). The contract names the slot; Step 1 leaves it empty. |

## The agnostic rule (what keeps the seam honest)

1. A spine skill (`web-reproduce` / `web-verify`) MUST NOT hardcode a framework. It addresses the
   **slot** ("run the active module's runtime", "use the module's recipes"), so a second framework module
   drops in without editing the spine.
2. A framework-module skill (`web-environment` / `web-source-map` / `astro-recipes`) MAY name its
   framework concretely — that specificity is the slot's value.
3. `recipes` are **generic to the framework**, never to an org or design system. Org/design-system
   specialization lives in an external **overlay** (e.g. the shipwithai pack's `astro-recipes`), which
   layers on top of this slot — it does not live here.

## Step-2 extraction note (not a Step-1 action)

`web-environment` mixes a framework-agnostic concern (port hygiene / kill-stale-server on a TCP port)
with an Astro-specific one (`.astro/` + Vite cache discipline). When a second framework arrives, the
agnostic part is a candidate to extract into a shared runtime helper. **Do not split it in Step 1** —
`web-environment` stays whole as the Astro module's `runtime` slot for now.

## What this contract does NOT do

- It ships **no code** and **no dispatch implementation** — it is the documented seam; the spine skills
  reference it.
- It does **not** implement the `locate` slot (reserved for Sprint 3 / B-LOC).
- It does **not** split the plugin or rename `web` → `astro` (Step 2, when a second framework arrives).
- It does **not** define org-specific or design-system recipes — those live in an external overlay pack.
