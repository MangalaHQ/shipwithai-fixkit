'use strict';
// Synthetic UI-geometry bug (web-stub) in its ORIGINAL, FAILING form.
// A code block whose content is wider than its box: scrollWidth > clientWidth (overflow).
// `reproduce.test.js` runs against THIS module and fails — that failing run IS the reproduction.
// The fix lives in `fixed.js` (content wrapped so scrollWidth <= clientWidth).
function geometry() {
  // clientWidth = the visible box; scrollWidth = the laid-out content.
  // BUG: a long unwrapped line overflows the box.
  return { clientWidth: 320, scrollWidth: 880 };
}
module.exports = { geometry };
