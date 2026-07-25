# shipwithai-fixkit

> The reusable, stack-agnostic **bug-fix engine** of the `shipwithai-fixkit` family. Public/MIT.
> Knows nothing ShipWithAI-specific (that lives in the sibling repo `shipwithai-fixkit-focus`).

**Front-end dev with an Astro project?** Start at [docs/QUICKSTART-FE.md](docs/QUICKSTART-FE.md).

Fixkit classifies a bug by the **layer its symptom lives in** (UI / Logic / System), debugs it on
a vendored **systematic-debugging spine**, and closes it only on **layer-appropriate proof** — a
rendered bug never closes on a source diff. The Iron Law (no fix before root cause), the integrity
rule (no runner → no auto-close → handoff/v0), and 3-strikes escalation are enforced by a **ledger
state machine**, not by good intentions.

## Install & use

In Claude Code, add the marketplace once, then install the engine plus the adapter for your stack:

```
/plugin marketplace add MangalaHQ/shipwithai-fixkit
/plugin install shipwithai-fixkit-core@shipwithai-fixkit
/plugin install shipwithai-fixkit-web@shipwithai-fixkit    # or -backend / -kmp / -android / -ios
```

Some adapters need their measurement runner installed **in your project** (nothing is vendored).
For the web adapter: `npm install -D playwright && npx playwright install chromium`.

Then, from your project root (dev server running if the bug is a rendered one), hand the engine
a bug:

```
/shipwithai-fixkit-core:fix <symptom, page URL or failing job, what you expected>
```

The engine opens a ledger entry under `.fixkit/` (commit it — it is the bug's audit trail),
REPRODUCEs the symptom with a live measurement, writes the root cause, applies the fix, and
re-runs the same measurement to VERIFY. The bug reaches `closed` only on layer-appropriate proof
at `capability_tier: FULL`; with no runner wired, it stops honestly at `candidate` with a
`handoff/v0` verification request instead of a fake close.

Full front-end walkthrough: [docs/QUICKSTART-FE.md](docs/QUICKSTART-FE.md). Each adapter's README
documents its connector mappings, capability tier, and prerequisites.

## Repo layout

```
shipwithai-fixkit/
├── .claude-plugin/marketplace.json          # name: "shipwithai-fixkit"; registers core
├── .github/workflows/                       # validate-plugin.yml + publish-plugin.yml
├── NOTICE                                    # vendored-spine attribution (MIT (c) 2025 Jesse Vincent)
├── docs/adr/                                 # ADR-0001..0004
└── plugins/
    ├── shipwithai-fixkit-core/              # the engine
    └── shipwithai-fixkit-{web,backend,kmp,android,ios}/  # platform adapters
```

The five platform adapters (`web`, `backend`, `kmp`, `android`, `ios`) ship alongside the core;
the ShipWithAI org pack lives in the sibling repo `shipwithai-fixkit-focus`.

> **Migration note (0.3.0):** the standalone `shipwithai-fixkit-web-harness` plugin was folded
> into `shipwithai-fixkit-web@0.3.0`, which now contains the in-loop Playwright runner. If you
> installed `shipwithai-fixkit-web-harness`, uninstall it and upgrade the web adapter.

## `shipwithai-fixkit-core`

| Component | Role |
|---|---|
| `commands/fix.md` | orchestrator (main thread): intake → classify → dispatch → gate → verify → close |
| `skills/triage` | Axis-A classifier (UI/Logic/System + subtype + severity) |
| `skills/spine` | vendored REPRODUCE→ISOLATE→DIAGNOSE→FIX→VERIFY→GUARD discipline |
| `skills/verification` | proof-by-layer matrix; FULL runs, ASSIST hands off |
| `skills/regression-guard` | leaves the layer-appropriate guard artifact |
| `agents/*-bug-agent.md` | isolated UI / Logic / System fixers, each embedding the spine |
| `lib/ledger-validator.js` | the ledger state machine — the deterministic gate trust anchor |
| `tests/run-all.js` | runs the negative tests + blocking linters (CI hook) |

## The deterministic gate

`cd plugins/shipwithai-fixkit-core && node tests/run-all.js` proves the Phase-0 acceptance checks:
a happy-path lifecycle reaches `closed`; an empty-evidence close, a fix-before-root-cause
transition, an ASSIST close, and a UI-on-source-diff close are all **blocked**; 3 simulated failed
fixes **fire** escalation; and the convention/eval/version linters pass. Exit 0 = gate green.

## Source of truth

Design docs: `../shipwithai-fixkit-design/` (canonical: `09-ARCHITECTURE-SPEC-V2.md`; roadmap:
`10-ROADMAP.md`). Conventions: `../shipwithai-plugins/`. Phase-0 decision: `docs/adr/0004`.

## License

MIT. Vendored spine credited in `NOTICE`.
