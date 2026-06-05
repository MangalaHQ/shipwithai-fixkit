'use strict';
// Synthetic Android shared-logic bug (android-stub-logic), ORIGINAL failing form.
// Simulates a pure business-logic function consumed by a ViewModel (host-JVM runnable, no device):
// discountedCents(priceCents, percentOff) must return priceCents - round(priceCents * percentOff / 100).
// BUG: it subtracts the percent as a flat amount (priceCents - percentOff), so
// discountedCents(2000, 10) yields 1990 instead of 1800. This logic runs on the JVM via
// ./gradlew testDebugUnitTest, so the layer is FULL: `reproduce.test.js` runs against THIS module and
// fails — that failing test IS the reproduction. The fix lives in `fixed.js`.
function discountedCents(priceCents, percentOff) {
  return priceCents - percentOff;   // BUG: should be priceCents - Math.round(priceCents * percentOff / 100)
}
module.exports = { discountedCents };
