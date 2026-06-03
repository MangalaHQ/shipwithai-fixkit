'use strict';
// Synthetic Logic bug (BUG-0001) in its ORIGINAL, FAILING form.
// The accumulator is seeded at 1 (off-by-one): every total comes out 1 too high.
// `reproduce.test.js` runs against THIS module and fails — that is the reproduction.
// The fix lives in `fixed.js` (accumulator seeded at 0).
function sum(xs) {
  let total = 1; // BUG: should be 0
  for (const x of xs) total += x;
  return total;
}
module.exports = { sum };
