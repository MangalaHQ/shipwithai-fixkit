# Changelog — shipwithai-fixkit-kmp

## 0.1.0
- Initial thin Kotlin Multiplatform adapter: `CONNECTORS.md` (~~test-runner → ./gradlew :shared:test,
  ~~ci → GitHub Actions, ~~runtime → JVM, ~~source control; **no ~~browser/device**),
  `lib/capability.json` (**Logic/System = FULL, UI = ASSIST**), four recipe skills
  (kmp-environment/reproduce/verify/source-map), and two stub fixtures: `kmp-stub-logic` (shared-
  logic reproduce→verify) and `kmp-stub-assist` (the first ASSIST exercise — emits a `handoff/v0`
  that passes core's `validateHandoff`, paired with an ASSIST ledger at `candidate`).
- Blocking `tests/run-all.js`: both stub lifecycles + capability declaration + negative tests via
  core's `validateLedger`/`validateHandoff` (`ASSIST_CANNOT_CLOSE`, `HANDOFF_LAYER_MISMATCH`,
  `HANDOFF_NO_VERIFIED_BY_SLOT`, `VERIFICATION_LAYER_MISMATCH`, `INTEGRITY_EVIDENCE_EMPTY` + ACCEPT
  controls) + three mutation checks (capability flip, lifecycle flip, handoff drop) + convention
  linters + 4-key version sync.
- Real Gradle/JVM bug runs (one shared-logic → closed; one Compose/SwiftUI → candidate + handoff)
  are the deferred gate-run, pending a named KMP target.
