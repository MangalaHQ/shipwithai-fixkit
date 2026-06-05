'use strict';
// Synthetic iOS shared-logic bug (ios-stub-logic), ORIGINAL failing form.
// Simulates a pure business-logic function consumed by a SwiftUI ObservableObject view model
// (host-runnable via `swift test`, no simulator): totalWithTipCents(billCents, tipPercent) must
// return billCents + round(billCents * tipPercent / 100).
// BUG: it adds the percent as a flat amount (billCents + tipPercent), so
// totalWithTipCents(5000, 18) yields 5018 instead of 5900. This logic runs + reports on the macOS
// host, so the layer is FULL: `reproduce.test.js` runs against THIS module and fails — that failing
// test IS the reproduction. The fix lives in `fixed.js`.
function totalWithTipCents(billCents, tipPercent) {
  return billCents + tipPercent;   // BUG: should be billCents + Math.round(billCents * tipPercent / 100)
}
module.exports = { totalWithTipCents };
