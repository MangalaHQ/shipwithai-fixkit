---
name: browser-drive
description: "The ~~browser binding: a headless Playwright runner (lib/drive.js) that observes a live page and emits one of the 5 UI LAYER_METHODS with observed-number evidence. Engine-internal mechanism."
version: 0.1.0
license: MIT
user-invocable: false
---

# browser-drive — the in-loop `~~browser` mechanism (headless Playwright)

This skill is the **recipe surface** for the harness's `~~browser` binding. The engine (core's
spine, REPRODUCE and VERIFY phases) drives it to observe a live web target **itself** — measure DOM
geometry, read computed styles, capture console, drive interactions, sweep the viewport — and record
the **observed numbers** as proof. It is pure mechanism: it does not classify the bug, pick the
proof method, or edit source (core's `triage` / `verification` / layer-agents do that).

When the web adapter's `CONNECTORS.md` resolves `~~browser` to this harness, invoke the runner via
Bash. It prints **one JSON line** `{ method, ok, evidence }` and exits 0 on success.

## Invocation (the CLI contract)

```
node plugins/shipwithai-fixkit-web-harness/lib/drive.js --url <url> --measure <type> [options]
```

- `ok` is `true` when the **healthy** state holds. REPRODUCE expects `ok:false` (bug present);
  VERIFY expects `ok:true` (fixed). Reproduce and verify call the **same** measure on the **same**
  selector — verify just asserts the mirrored result.
- `method` is always one of the five UI `LAYER_METHODS`; write it verbatim into
  `verification.method`. `evidence` is the observed numbers; write it into `verification.evidence`.
- On failure (bad selector, timeout, nav error) the runner exits **non-zero** with
  `{ ok:false, error }` and **no `method`** — a failed observation is never proof; record a
  fix-failure (feeds 3-strikes), never a close.
- Prerequisite: Playwright (`npx playwright install chromium`) — see this plugin's `CLAUDE.md`.

## The five measures (one per UI LAYER_METHOD)

```
overflow        --selector <sel>                              -> dom-assertion
computed-style  --selector <sel> --prop <p> [--expected <v>]  -> computed-style
console         [--wait <ms>]                                 -> console-assertion
interaction     --selector <sel> --target <sel> [--prop <p>] [--expected <v>] -> interaction-assertion
viewport        --selector <sel> [--widths 1280,768,375]      -> browser-assertion
```

- **overflow** — `scrollWidth` vs `clientWidth` on the element; `ok` when no overflow.
- **computed-style** — `getComputedStyle(el)[prop]`; `ok` when `value === expected` (if given).
- **console** — captures `error`/`warning` console output + page errors on load; `ok` when none.
- **interaction** — clicks `--selector`, reads `--target`'s prop before/after; `ok` when it changed
  to `--expected` (or simply changed, if no `--expected`). `--prop` defaults to `textContent` and is
  bounded to a safe state allowlist (`textContent`/`innerText`/`value`/`checked`/`disabled`/
  `className`/`id`/`ariaLabel`) — never arbitrary element internals.
- **viewport** — re-measures overflow across `--widths`; `ok` when no width overflows.

## Example — reproduce then verify a code-block overflow

```
# REPRODUCE (expect ok:false): the <pre> overflows its box
node plugins/shipwithai-fixkit-web-harness/lib/drive.js \
  --url http://localhost:4321/blog/x --measure overflow --selector 'pre'
# -> {"method":"dom-assertion","ok":false,"evidence":{"scrollWidth":612,"clientWidth":280,"overflow":true}}

# VERIFY (expect ok:true) after the fix — same selector, mirrored assertion
node plugins/shipwithai-fixkit-web-harness/lib/drive.js \
  --url http://localhost:4321/blog/x --measure overflow --selector 'pre'
# -> {"method":"dom-assertion","ok":true,"evidence":{"scrollWidth":280,"clientWidth":280,"overflow":false}}
```

The target is stood up by the adapter's `~~runtime` (`astro dev :4321`) — the runner receives the
URL; it does not embed the server command. The `verified_by` recorded is the layer-agent plus this
runner, e.g. `ui-bug-agent (web-harness/playwright)`.

## What this skill does NOT do
- It does not classify the bug, pick which proof counts, or decide the symptom layer — core's
  `triage` / `verification` do; this only observes and reports numbers.
- It does not edit application source or author the fix — the layer-agent does.
- It does not stand up the dev server (the adapter's `~~runtime` / `web-environment` does) or close
  the ledger (core's integrity rule does); and it never emits a `method` for a failed observation.
