'use strict';
// VERIFICATION for the web-stub UI-geometry bug. Runs the expected behaviour against FIXED.
// It passes (exit zero) — that passing run IS the verification evidence.
// Verification MIRRORS reproduction: the same scrollWidth <= clientWidth assertion, now true.
const assert = require('assert');
const { geometry } = require('./fixed');

const { scrollWidth, clientWidth } = geometry();
assert.ok(scrollWidth <= clientWidth, `scrollWidth (${scrollWidth}) <= clientWidth (${clientWidth})`);
console.log('web-stub verify: scrollWidth <= clientWidth (overflow fixed)');
