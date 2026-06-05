---
name: ios-environment
description: "Locate the .xcodeproj/scheme or Package.swift on a macOS host; enforce build hygiene: confirm the test action, clear DerivedData, clean state. Triggers: 'set up the iOS build'."
version: 0.1.0
license: MIT
user-invocable: true
---

# ios-environment — stand up + clean the macOS host loop

The iOS adapter's environment recipe. Before reproduce/verify can run, the **macOS host loop** must be
locatable and clean. This skill finds the toolchain and enforces build hygiene so a failing test is a
real signal, not a stale-DerivedData artifact. It does **not** stand up a device — that runtime is
unobserved (UI = ASSIST).

> **Precondition:** a macOS host with the Xcode / Swift toolchain. Off macOS, the host loop is
> unavailable and the FULL claims do not hold.

## Locate the toolchain
- Find the project: a `Package.swift` (SwiftPM) or an `.xcodeproj` / `.xcworkspace` + a build scheme
  (`xcodebuild -list` enumerates schemes/targets). Confirm Xcode is selected (`xcode-select -p`).
- Confirm the **host-runnable test action** exists: `swift test --list-tests` for SwiftPM, or a Test
  action on the scheme (`xcodebuild test -scheme <S> -showBuildSettings`). This is what makes **Logic
  FULL** — the agent observes the test *result*, no rendered screen required.

## Build hygiene (so a red test means a real bug)
- Clear stale build output before a clean run so a cached artifact can't mask a fix:
  `rm -rf ~/Library/Developer/Xcode/DerivedData/<Project>-*` (or `xcodebuild clean`), or
  `swift package clean` for SwiftPM.
- Pin the canonical scheme/configuration so reproduce and verify observe the *same* target.

```bash
xcode-select -p && xcodebuild -list      # toolchain + schemes
swift package clean && swift test        # clean host-runnable test run (SwiftPM)
```

## What this confirms before reproduce/verify
- `~~test-runner` is reachable (`swift test` / `xcodebuild test` runs) → Logic FULL is honest.
- `~~ci` / a local `xcodebuild build` is reachable → System FULL is honest.
- **No device connector** → UI stays ASSIST; do not attempt to observe a render here.

## What this skill does NOT do
- It does not stand up or observe a simulator/device — that runtime is unwired (UI = ASSIST).
- It does not fix bugs, write tests, or emit a handoff — those are reproduce/verify.
- It does not declare capability tiers (that is `lib/capability.json`) or wire any MCP connector.
