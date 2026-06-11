---
name: astro-recipes
description: "Generic Astro UI-render fix recipes: client:* hydration, unwired *.behavior.ts, <pre> overflow — each targets a browser-drive measure. Triggers: 'astro recipe', 'hydrate this island'."
version: 0.2.1
license: MIT
user-invocable: true
---

# astro-recipes — generic Astro UI-render fix patterns

The Astro framework module's **`recipes` slot** (see `lib/framework-module.contract.md`). These are
**framework-generic** patterns for the most common Astro UI-render bugs — expressed with **no** org or
design-system specifics (no `@shipwithai/design`, no named organism). Each recipe names the
`browser-drive` measure (this adapter's bundled runner CLI) that reproduces and verifies it; the
close is a live measurement, never a source diff.

An org-specific overlay (e.g. a private pack's `astro-recipes`) may layer concrete import paths and
component names on top of these — that specialization lives in the overlay, not here.

## Recipe index

| Symptom (reproduced) | Likely cause | Recipe | Harness measure |
|---|---|---|---|
| interactive island is dead (clicks do nothing) | a React island ships no `client:*` directive | **Hydration (a)** | `interaction` |
| interactive markup is dead, but a sibling `*.behavior.ts` exists | the consumer never wired the behavior (Astro does not auto-run island JS) | **Hydration (b)** | `interaction` / `scroll-read-state` |
| a `<pre>` overflows and pushes the **page** sideways | a `<pre>` outside a prose container lacks `overflow-x:auto` | **Overflow** | `overflow` on the page root (`body`) |

## Hydration (a) — a React island with no `client:*`

An Astro-rendered React component is static HTML until it is hydrated. With no `client:*` directive at
the **usage site**, no JS ships and every handler is dead. Add the directive that matches the need:

```astro
---
import Counter from '../components/Counter.jsx';
---
<!-- before: dead (no JS shipped) -->
<Counter />
<!-- after: hydrates and becomes interactive -->
<Counter client:load />   <!-- or client:visible / client:idle -->
```

Reproduce + verify (`interaction`): click the control, read a state prop before/after.

```sh
node plugins/shipwithai-fixkit-web/lib/drive.js \
  --url http://localhost:4321/<route> --measure interaction \
  --selector '[data-counter] button' --target '[data-counter] output' --prop textContent
# REPRODUCE expects ok:false (no change); VERIFY expects ok:true (state changed after the fix)
```

## Hydration (b) — an unwired sibling `*.behavior.ts`

A common Astro pattern: a component renders markup (often controls `disabled`) and ships its behavior in
a sibling module exporting an init function. Astro does **not** auto-run that module — the **consumer**
must wire it once with a client `<script>`. Use a generic `data-*` hook, not a named organism:

```astro
<script>
  import { initWidget } from '../components/Widget/Widget.behavior.ts';
  const el = document.querySelector('[data-widget]');
  if (el) initWidget(el);
</script>
```

If the behavior reveals on scroll (a scroll-spy enabling controls past a read-threshold), prove it with
`scroll-read-state` instead of a click:

```sh
node plugins/shipwithai-fixkit-web/lib/drive.js \
  --url http://localhost:4321/<route> --measure scroll-read-state \
  --target '[data-widget] button' --ratio 0.5 --prop disabled
# the button flips disabled true->false once the wired scroll-spy fires (ok:true after the fix)
```

## Overflow — a `<pre>` that pushes the page sideways

A code-block `<pre>` rendered outside the prose/typography wrapper (e.g. a standalone snippet card)
misses the body overflow rule, so a long line **pushes the whole page sideways** on narrow viewports.
Give the `<pre>` `overflow-x:auto` to **contain** the scroll (the code keeps its own horizontal scroll,
no wrap):

```css
.snippet :global(pre) { overflow-x: auto; }
```

Reproduce + verify (`overflow`) on the **page root** — the element that must not scroll sideways — **not**
the `<pre>`. `overflow-x:auto` contains the overflow so the page root fits, but the `<pre>` itself stays
`scrollWidth > clientWidth` **by design** (it scrolls its own code), so verifying on the `<pre>` can never
go green. Select `body` (or `html`):

```sh
node plugins/shipwithai-fixkit-web/lib/drive.js \
  --url http://localhost:4321/<route> --measure overflow --selector 'body'
# REPRODUCE expects ok:false (the page overflows sideways); VERIFY expects ok:true (contained)
```

## How to use a recipe

1. Confirm the symptom is reproduced by the named measure (`ok:false`) before touching source.
2. Apply the minimal generic fix above (directive / wiring `<script>` / CSS rule).
3. Re-run the **same** measure; the close is `ok:true` on the live measurement (mirror principle).
4. If the project needs an org-specific import path or component name, that is the overlay pack's job —
   do not bake it into this generic recipe.

## What this skill does NOT do

- It does not diagnose or pick the proof method — core's spine / `verification` do; it prescribes the
  generic fix + names the harness measure.
- It is **framework-generic, not org-specific**: it names no design-system import path or organism — an
  overlay pack adds that.
- It does not stand up the dev server (`web-environment`), reproduce/verify by itself (the harness does),
  or close the ledger (core's integrity rule does).
- It does not cover content-collection-cache, routing, or build recipe classes (out of Step-1 scope).
