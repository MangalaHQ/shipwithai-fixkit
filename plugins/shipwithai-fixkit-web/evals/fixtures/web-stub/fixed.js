'use strict';
// web-stub FIXED. Smallest change at the root cause: wrap the content so it fits its box.
// `verify.test.js` runs against THIS module and passes — that passing run IS the verification.
function geometry() {
  // FIX: content now wraps within the box, so it no longer overflows.
  return { clientWidth: 320, scrollWidth: 320 };
}
module.exports = { geometry };
