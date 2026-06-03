'use strict';
// REPRODUCTION for BUG-0001. Runs the expected behaviour against the BUGGY module.
// It is SUPPOSED to fail (exit non-zero) — that failing run IS the reproduction.
const assert = require('assert');
const { sum } = require('./buggy');

assert.strictEqual(sum([1, 2, 3]), 6, 'REPRODUCED: sum([1,2,3]) should be 6 (off-by-one in buggy.js)');
console.log('unexpected: buggy module already correct');
