# Changelog — shipwithai-fixkit-android

## 0.1.0
- Initial thin Android adapter: `CONNECTORS.md` (~~test-runner → ./gradlew testDebugUnitTest,
  ~~ci → GitHub Actions, ~~runtime → Gradle/host JVM, ~~source control; **no ~~browser/device**),
  `lib/capability.json` (**Logic/System = FULL, UI = ASSIST**), four recipe skills
  (android-environment/reproduce/verify/source-map), and two stub fixtures: `android-stub-logic`
  (host-JVM-runnable reproduce→verify) and `android-stub-assist` (the ASSIST exercise — emits a
  device-targeted `handoff/v0` that passes core's `validateHandoff`, paired with an ASSIST ledger at
  `candidate`).
- Blocking `tests/run-all.js`: both stub lifecycles + capability declaration + negative tests via
  core's `validateLedger`/`validateHandoff` (`ASSIST_CANNOT_CLOSE`, `HANDOFF_LAYER_MISMATCH`,
  `HANDOFF_NO_VERIFIED_BY_SLOT`, `HANDOFF_NO_TARGET_ENV`, `VERIFICATION_LAYER_MISMATCH`,
  `INTEGRITY_EVIDENCE_EMPTY` + ACCEPT controls incl. a filled-ledger advance and an
  interaction-assertion handoff) + four mutation checks (capability flip, lifecycle flip, handoff
  expected-drop, handoff target-drop) + convention linters + 4-key version sync.
- Device proof reuses core's existing UI `LAYER_METHODS` (computed-style / interaction-assertion /
  console-assertion) — **zero core edits**.
- Real Android runs (one host-JVM logic bug → closed; one Compose/View UI bug → candidate + handoff)
  are the deferred gate-run, pending a named Android target.
