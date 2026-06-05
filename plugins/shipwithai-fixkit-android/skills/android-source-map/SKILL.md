---
name: android-source-map
description: "Symptom -> file hints on an Android tree: Activity/Fragment/Compose tree vs ViewModel vs resource/layout vs pure logic; logcat -> source. Generic level only. Internal: engine isolate step."
version: 0.1.0
license: MIT
user-invocable: false
---

# android-source-map — map a symptom to the likely source on an Android tree

The Android adapter's isolate recipe: generic rules of thumb that turn a symptom into the **layer +
the suspect files**, so reproduce/verify aim at the right place. This is *hints*, not a fixer — it
narrows the search and routes to the right tier (which decides FULL vs ASSIST).

## Layer seams
- **Pure logic / ViewModel** (`*.kt` under the app/business source set, `ViewModel`/use-case classes):
  a value computed wrong, wrong state, bad async/data transform. Reproducible by a host-JVM unit test
  ⇒ **Logic FULL**.
- **View layer** (`@Composable` functions, `Activity`/`Fragment`, XML layouts under `res/layout`,
  `res/values`): a render/layout/interaction symptom. Observed only on a device ⇒ **UI ASSIST**.
- **Build / dependency / config** (`build.gradle(.kts)`, `gradle/libs.versions.toml`,
  `AndroidManifest.xml`, `gradle.properties`): build breaks, dependency conflicts, manifest/config ⇒
  **System FULL** (host-observable).

## Rules of thumb
- **Wrong value, both light + dark / both locales / headless test** ⇒ logic or ViewModel, not the view.
- **Looks wrong only on the rendered screen** (clipping, overlap, truncation, wrong color/spacing) ⇒
  the Compose/View + resource layer ⇒ UI ASSIST (route to a handoff).
- **Build/dependency/manifest error** ⇒ Gradle/config ⇒ System.
- A `logcat` stack trace points at the throwing class; map the top app frame back to its source file,
  then decide the seam by *what* is wrong (a computed value vs a render).

## Boundary
A symptom that only appears at device runtime and cannot be reproduced by a host-JVM test belongs to
the **UI/ASSIST lane** even if it looks "logic-ish" — if the host cannot observe it, it cannot be FULL.

## What this skill does NOT do
- It does not fix the bug, write tests, or emit a handoff — it only locates and routes.
- It does not decide the proof method (that is `android-verify`) or override a capability tier.
- It does not assume project-specific paths beyond the generic Android source-set conventions.
