# shipwithai-fixkit

> The reusable, stack-agnostic **bug-fix engine** of the `shipwithai-fixkit` family. Public/MIT.
> Knows nothing ShipWithAI-specific (that lives in the sibling repo `shipwithai-fixkit-focus`).

**Front-end dev with an Astro project?** Start at [docs/QUICKSTART-FE.md](docs/QUICKSTART-FE.md).

Fixkit classifies a bug by the **layer its symptom lives in** (UI / Logic / System), debugs it on
a vendored **systematic-debugging spine**, and closes it only on **layer-appropriate proof** — a
rendered bug never closes on a source diff. The Iron Law (no fix before root cause), the integrity
rule (no runner → no auto-close → handoff/v0), and 3-strikes escalation are enforced by a **ledger
state machine**, not by good intentions.

## Repo layout

```
shipwithai-fixkit/
├── .claude-plugin/marketplace.json          # name: "shipwithai-fixkit"; registers core
├── .github/workflows/                       # validate-plugin.yml + publish-plugin.yml
├── NOTICE                                    # vendored-spine attribution (MIT (c) 2025 Jesse Vincent)
├── docs/adr/                                 # ADR-0001..0004
└── plugins/
    ├── shipwithai-fixkit-core/              # the engine
    └── shipwithai-fixkit-{web,web-harness,backend,kmp,android,ios}/  # adapters + harness
```

The five platform adapters (`web`, `backend`, `kmp`, `android`, `ios`) and the web-harness ship
alongside the core; the ShipWithAI org pack lives in the sibling repo `shipwithai-fixkit-focus`.

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
