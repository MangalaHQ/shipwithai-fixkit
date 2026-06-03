'use strict';
// VERIFICATION for BUG-0001. Runs the expected behaviour against the FIXED module.
// It passes (exit zero) — that passing run IS the verification evidence.
const assert = require('assert');
const { sum } = require('./fixed');

assert.strictEqual(sum([1, 2, 3]), 6, 'sum([1,2,3]) === 6');
assert.strictEqual(sum([]), 0, 'sum([]) === 0');
console.log('stub-adapter verify: 2/2 passing (fix confirmed)');
