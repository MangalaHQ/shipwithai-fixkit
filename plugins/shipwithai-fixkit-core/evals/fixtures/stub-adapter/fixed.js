'use strict';
// BUG-0001 FIXED. Smallest change at the root cause: seed the accumulator at 0.
// `verify.test.js` runs against THIS module and passes — that is the verification.
function sum(xs) {
  let total = 0; // FIX: was 1 (off-by-one)
  for (const x of xs) total += x;
  return total;
}
module.exports = { sum };
