'use strict';
// REPRODUCTION: a failing automated test (the Logic reproduce idiom, doc 09 §7).
// Runs the expected behaviour against BUGGY -> fails (exit non-zero). The failing run IS
// the reproduction; its method analog is `failing-test-passes` once it goes green.
const assert = require('assert');
const { sumRange } = require('./buggy');
const got = sumRange(5);
assert.strictEqual(got, 15, `REPRODUCED: sumRange(5) returned ${got} (expected 15)`);
console.log('unexpected: buggy sumRange already correct');
