'use strict';
// Fixed form of the kmp-stub-logic bug: VAT is a percentage of net, rounded.
function gross(net, vatPercent) {
  return net + Math.round(net * vatPercent / 100);
}
module.exports = { gross };
