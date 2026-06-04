---
name: web-environment
description: "Stand up or locate the runnable web target on port 4321 (astro dev); hard-refresh, cache discipline, kill stale servers. Triggers: 'start the dev server', 'the page is stale'."
version: 0.1.0
license: MIT
user-invocable: true
---

# web-environment — make the target runnable and observable

Before any UI reproduce or verify recipe runs, there must be a **live, fresh** target to observe.
This skill stands up (or locates) that target and enforces the cache discipline that keeps a
measurement honest. It is the web adapter's binding for `~~runtime`.

## Canonical target
- **Port 4321** is the canonical `astro dev` port. Use `http://localhost:4321/<route>` as the
  observation URL in reproduce/verify recipes and in any `handoff/v0` `target.url`.
- Prefer `~~runtime` = `astro dev` (live HMR). Fall back to `astro preview` / `vite preview` for a
  built artifact when a live server is not needed.

## Stand up / locate
1. Check whether something already serves 4321 (e.g. `curl -s -o /dev/null -w "%{http_code}"
   http://localhost:4321/`). If a **stale** server answers, kill it before starting a new one.
2. Start the dev server, wait until the route responds, then observe.

```sh
# locate or (re)start the canonical target on 4321
lsof -ti:4321 | xargs -r kill        # kill a stale server holding the port
npm run dev -- --port 4321 &         # or: npx astro dev --port 4321
# wait until it answers, then observe http://localhost:4321/<route>
```

## Cache discipline (a stale read is a false result)
A measurement taken against a cached page proves nothing. Before observing:
- **Hard-refresh** the page (bypass the HTTP/browser cache) so you read freshly rendered DOM.
- When the build looks stale or HMR is wedged, clear the build caches and restart:
  - `.astro/` (Astro's generated cache, incl. content-collections)
  - `node_modules/.vite` (Vite's transform cache)
- Kill **stale dev servers** (a second server on another port serving old code is a classic
  false-pass / false-fail source).

## The `file:`-symlinked design-package caching caveat
When the design system is consumed as a **`file:` dependency** (a symlink into a sibling package),
edits in the source package may **not** invalidate the consumer's caches: Vite/Astro can keep a
cached copy of the linked module. If a design-package change is not showing up, treat it as a
cache problem first — clear `.astro/` and `node_modules/.vite`, restart the dev server, then
hard-refresh — before suspecting the change itself.

## Output
A confirmed observation URL on 4321 against a freshly built, hard-refreshed page, ready for
`web-reproduce` / `web-verify`. Record the URL + viewport in the ledger target.

## What this does NOT do
- It does not reproduce, verify, or diagnose anything — it only makes the target runnable + fresh.
- It does not pick the proof method or classify the bug (core's `triage` / `verification` do).
- It does not bind the browser connector — `~~browser` mapping lives in `CONNECTORS.md`.
- It does not edit application or design-package source; it only manages servers and caches.
