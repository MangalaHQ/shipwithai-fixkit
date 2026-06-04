'use strict';
// Fixed form of the backend-stub-logic bug: inclusive 1..n.
function sumRange(n) {
  let total = 0;
  for (let i = 1; i <= n; i++) total += i;
  return total;
}
module.exports = { sumRange };
