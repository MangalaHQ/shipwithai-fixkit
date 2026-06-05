---
name: ios-source-map
description: "Symptom -> file hints on an iOS tree: SwiftUI view / UIViewController vs ObservableObject/ViewModel vs storyboard/asset vs logic; crash log -> source. Internal: engine isolate step."
version: 0.1.0
license: MIT
user-invocable: false
---

# ios-source-map — map a symptom to the likely source on an iOS tree

The iOS adapter's isolate recipe: generic rules of thumb that turn a symptom into the **layer + the
suspect files**, so reproduce/verify aim at the right place. This is *hints*, not a fixer — it narrows
the search and routes to the right tier (which decides FULL vs ASSIST).

## Layer seams
- **Pure logic / view model** (`*.swift` business types, `ObservableObject`/use-case classes): a value
  computed wrong, wrong `@Published` state, bad async/data transform. Reproducible by a host-runnable
  unit test ⇒ **Logic FULL**.
- **View layer** (`View` structs / `@ViewBuilder`, `UIViewController`, storyboards/XIBs, asset
  catalogs): a render/layout/Dynamic-Type/interaction symptom. Observed only on a device ⇒ **UI ASSIST**.
- **Build / dependency / config** (`Package.swift`, `project.pbxproj`, `*.xcconfig`, `Info.plist`,
  `Podfile`): build breaks, dependency conflicts, config/plist ⇒ **System FULL** (host-observable).

## Rules of thumb
- **Wrong value in a headless unit test / both light + dark / both locales** ⇒ logic or view model,
  not the view.
- **Looks wrong only on the rendered screen** (truncation, clipping, overlap, wrong color/spacing,
  safe-area) ⇒ the SwiftUI/UIKit + asset layer ⇒ UI ASSIST (route to a handoff).
- **Build/dependency/plist error** ⇒ SwiftPM/Xcode config ⇒ System.
- A crash log / symbolicated stack points at the throwing type; map the top app frame back to its
  source file, then decide the seam by *what* is wrong (a computed value vs a render).

## Boundary
A symptom that only appears at simulator/device runtime and cannot be reproduced by a host-runnable
test belongs to the **UI/ASSIST lane** even if it looks "logic-ish" — if the host cannot observe it,
it cannot be FULL.

## What this skill does NOT do
- It does not fix the bug, write tests, or emit a handoff — it only locates and routes.
- It does not decide the proof method (that is `ios-verify`) or override a capability tier.
- It does not assume project-specific paths beyond the generic iOS/SwiftPM source conventions.
