'use strict';
// REPRODUCTION for the web-stub UI-geometry bug. Runs the expected behaviour against BUGGY.
// It is SUPPOSED to fail (exit non-zero) — that failing run IS the reproduction.
// Mirrors web-reproduce's overflow recipe: scrollWidth <= clientWidth means no overflow.
const assert = require('assert');
const { geometry } = require('./buggy');

const { scrollWidth, clientWidth } = geometry();
assert.ok(scrollWidth <= clientWidth, `REPRODUCED: scrollWidth (${scrollWidth}) <= clientWidth (${clientWidth}) — overflow in buggy.js`);
console.log('unexpected: buggy geometry already fits');
