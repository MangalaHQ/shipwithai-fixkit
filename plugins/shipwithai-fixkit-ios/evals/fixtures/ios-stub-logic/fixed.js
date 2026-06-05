'use strict';
// ios-stub-logic, FIXED form. totalWithTipCents now applies the percentage correctly:
// billCents + round(billCents * tipPercent / 100). totalWithTipCents(5000, 18) === 5900.
// `verify.test.js` runs the SAME assertion the reproduction used, now against this module, and
// PASSES (method analog: failing-test-passes). Verification mirrors reproduction — never a diff.
function totalWithTipCents(billCents, tipPercent) {
  return billCents + Math.round(billCents * tipPercent / 100);
}
module.exports = { totalWithTipCents };
