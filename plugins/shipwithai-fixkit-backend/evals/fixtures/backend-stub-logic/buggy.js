'use strict';
// Synthetic backend LOGIC bug (backend-stub-logic), ORIGINAL failing form.
// sumRange(n) must return 1+2+...+n. BUG: the loop sums 0..n-1 (wrong start AND end),
// so sumRange(5) yields 10 instead of 15. `reproduce.test.js` runs against THIS module
// and fails — that failing test IS the reproduction. The fix lives in `fixed.js`.
function sumRange(n) {
  let total = 0;
  for (let i = 0; i < n; i++) total += i;   // BUG: should be i = 1; i <= n
  return total;
}
module.exports = { sumRange };
