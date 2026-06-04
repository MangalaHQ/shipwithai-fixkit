'use strict';
// Synthetic KMP shared-logic bug (kmp-stub-logic), ORIGINAL failing form.
// Simulates a `commonMain` pure function consumed by BOTH androidMain and iosMain:
// gross(net, vatPercent) must return net + (net * vatPercent / 100), rounded.
// BUG: it adds the percent as a flat amount (net + vatPercent), so gross(200, 10)
// yields 210 instead of 220. Because the wrong value appears on BOTH platforms, the
// root cause is the shared module (source-map rule: wrong on both ⇒ commonMain).
// `reproduce.test.js` runs against THIS module and fails — that failing test IS the
// reproduction. The fix lives in `fixed.js`.
function gross(net, vatPercent) {
  return net + vatPercent;   // BUG: should be net + Math.round(net * vatPercent / 100)
}
module.exports = { gross };
