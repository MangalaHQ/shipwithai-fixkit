'use strict';
// VERIFICATION mirrors reproduction: the SAME assertion, now against FIXED -> passes
// (exit zero). The passing run IS the `failing-test-passes` evidence. Extra edges pin it.
const assert = require('assert');
const { sumRange } = require('./fixed');
assert.strictEqual(sumRange(5), 15, `sumRange(5) = ${sumRange(5)}`);
assert.strictEqual(sumRange(1), 1, 'sumRange(1) = 1');
assert.strictEqual(sumRange(0), 0, 'sumRange(0) = 0');
console.log('backend-stub-logic verify: sumRange correct over 0,1,5 (failing test now passes)');
