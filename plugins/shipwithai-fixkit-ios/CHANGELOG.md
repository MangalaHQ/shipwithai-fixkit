# Changelog — shipwithai-fixkit-ios

## 0.1.0
- Initial thin iOS adapter: `CONNECTORS.md` (~~test-runner → swift test / xcodebuild test on a
  **macOS host**, ~~ci → GitHub Actions macOS runner, ~~runtime → macOS/Swift toolchain,
  ~~source control; **no ~~browser/device**), `lib/capability.json` (**Logic/System = FULL with a
  macOS+Xcode host precondition, UI = ASSIST**), four recipe skills
  (ios-environment/reproduce/verify/source-map), and two stub fixtures: `ios-stub-logic`
  (host-runnable reproduce→verify) and `ios-stub-assist` (the ASSIST exercise — emits a
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
- Logic/System FULL is symmetric with Android; the difference is the macOS host requirement, not the
  tier. Real iOS runs (one host-runnable logic bug → closed; one SwiftUI/UIKit UI bug → candidate +
  handoff) are the deferred gate-run, pending a named iOS target.
