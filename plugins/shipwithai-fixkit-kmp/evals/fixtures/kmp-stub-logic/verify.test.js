'use strict';
// VERIFICATION mirrors reproduction: the SAME assertion, now against FIXED -> passes
// (exit zero). The passing run IS the `failing-test-passes` evidence. Extra edges pin it.
const assert = require('assert');
const { gross } = require('./fixed');
assert.strictEqual(gross(200, 10), 220, `gross(200, 10) = ${gross(200, 10)}`);
assert.strictEqual(gross(0, 10), 0, 'gross(0, 10) = 0');
assert.strictEqual(gross(50, 20), 60, 'gross(50, 20) = 60');
assert.strictEqual(gross(100, 0), 100, 'gross(100, 0) = 100 (no VAT)');
console.log('kmp-stub-logic verify: gross correct over edges (failing test now passes)');
