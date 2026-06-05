'use strict';
// android-stub-logic, FIXED form. discountedCents now applies the percentage correctly:
// priceCents - round(priceCents * percentOff / 100). discountedCents(2000, 10) === 1800.
// `verify.test.js` runs the SAME assertion the reproduction used, now against this module, and
// PASSES (method analog: failing-test-passes). Verification mirrors reproduction — never a diff.
function discountedCents(priceCents, percentOff) {
  return priceCents - Math.round(priceCents * percentOff / 100);
}
module.exports = { discountedCents };
