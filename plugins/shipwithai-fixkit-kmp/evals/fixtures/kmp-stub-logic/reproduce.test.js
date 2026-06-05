'use strict';
// REPRODUCTION: a failing automated test (the Logic reproduce idiom, doc 09 §7).
// Runs the expected behaviour against BUGGY -> fails (exit non-zero). The failing run IS
// the reproduction; its method analog is `failing-test-passes` once it goes green.
const assert = require('assert');
const { gross } = require('./buggy');
const got = gross(200, 10);
assert.strictEqual(got, 220, `REPRODUCED: gross(200, 10) returned ${got} (expected 220)`);
console.log('unexpected: buggy gross already correct');
