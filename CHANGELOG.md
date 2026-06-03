# Changelog — shipwithai-fixkit (repo)

All notable changes to the repo scaffold are documented here. Per-plugin changes live in each
plugin's `CHANGELOG.md`.

## [0.1.0] — 2026-06-03

### Added
- Repo scaffold to `shipwithai-plugins` conventions: root `.claude-plugin/marketplace.json`
  (registers `shipwithai-fixkit-core`), `.github/workflows/{validate-plugin,publish-plugin}.yml`,
  `README.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `QUALITY-STANDARDS.md`.
- `NOTICE` crediting the vendored `superpowers:systematic-debugging` spine (MIT © 2025 Jesse Vincent).
- ADRs: 0001 blueprints-as-SOT, 0002 plan-before-execute, 0003 read-before-edit,
  0004 deterministic-ledger-gate (Phase-0 structural decision).
- `plugins/shipwithai-fixkit-core` v0.1.0 — see its own CHANGELOG.
