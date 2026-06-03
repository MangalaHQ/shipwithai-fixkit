# ADR-0001 — Blueprints as source of truth

**Status:** Accepted (carried over from `shipwithai-plugins`).

## Context
`shipwithai-fixkit` is a sibling of the `shipwithai-plugins` family. Re-inventing repo structure,
CI, and conventions would cause drift.

## Decision
The central `shipwithai-plugins` repo is the blueprint. fixkit pulls its structure (monorepo
`plugins/<name>/`), CI shape (`validate-plugin.yml` + `publish-plugin.yml`), required-files list,
and plugin/manifest/marketplace shapes from there. Where fixkit must extend the blueprint, it does
so explicitly via an ADR (see ADR-0004), never by silent divergence.

## Consequences
- New plugins slot into the family without bespoke tooling.
- The blueprint's CI runs `tests/run-all.js` if present — fixkit uses that hook for its gate.
- If the blueprint is unreachable during a build, HALT and report rather than guessing.
