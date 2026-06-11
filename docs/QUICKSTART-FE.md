# Quickstart — fix front-end bugs on your Astro project

`shipwithai-fixkit` is a bug-fix engine for Claude Code: it classifies a bug by the layer its
symptom lives in, debugs on a systematic spine, and **closes only on measured browser proof** —
a rendered bug never closes on a source diff.

## Prerequisites
- Claude Code installed, Node 18+ (Playwright's supported floor)
- An Astro project that runs locally (`npm run dev`)

## Install (one time)
In Claude Code:

    /plugin marketplace add MangalaHQ/shipwithai-fixkit
    /plugin install shipwithai-fixkit-core@shipwithai-fixkit
    /plugin install shipwithai-fixkit-web@shipwithai-fixkit
    /plugin install shipwithai-fixkit-web-harness@shipwithai-fixkit

Then, **in your Astro project folder**, install the measurement runner's prerequisite — both the
`playwright` package and the browser binary (neither is vendored):

    npm install -D playwright
    npx playwright install chromium

## Fix a bug
1. Start your dev server: `npm run dev` (the engine measures the live page; it expects the Astro
   default `http://localhost:4321` — if your project serves elsewhere, put the URL in the bug
   description).
2. In Claude Code, run:

       /shipwithai-fixkit-core:fix <describe the bug — symptom, page URL, what you expected>

3. The engine creates a ledger entry under `.fixkit/` (committed into your repo — that's the bug's
   audit trail), REPRODUCEs the bug with a live headless measurement, finds the root cause, applies
   the fix, and re-runs the same measurement to VERIFY. The bug closes at `capability_tier: FULL`
   only when the live number flips.

## What proof looks like (real runs)
- **Hydration bug** (component never becomes interactive): measure `interaction` —
  REPRODUCE `ok:false` (click count 0→0) → fix `client:load` → VERIFY `ok:true` (count 0→1).
- **Overflow bug** (a `<pre>` pushes the page sideways): measure `overflow` on the **page root** —
  REPRODUCE `ok:false` (body scrollWidth 2443 / clientWidth 1280) → fix `overflow-x:auto` →
  VERIFY `ok:true` (1280/1280). The `<pre>` keeps its own scrollbar by design.

## If something is missing
- Runner says `playwright not installed` even after the install step? The runner lives in the
  plugin install, outside your project tree, so Node may not see your project's modules. Tell the
  engine in the bug description to invoke the runner with your modules on the path:
  `NODE_PATH=<your-project>/node_modules` (verified recipe).
- No Playwright/runner at all? The engine will not pretend: the integrity rule stops auto-close,
  the bug ends at `candidate` with a `handoff/v0` verification request instead of a fake `closed`.

License: MIT.
