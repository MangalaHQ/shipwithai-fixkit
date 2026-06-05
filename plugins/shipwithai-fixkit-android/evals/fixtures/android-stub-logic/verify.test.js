'use strict';
// VERIFICATION: the SAME assertion the reproduction used, now run against FIXED -> passes (exit 0).
// Mirror principle (doc 09 §7): a bug reproduced by a failing test is verified by that test passing
// + the suite staying green, never by a source diff. Extra edge assertions guard the boundary.
const assert = require('assert');
const { discountedCents } = require('./fixed');
assert.strictEqual(discountedCents(2000, 10), 1800, 'fixed: 10% off 2000c is 1800c');
assert.strictEqual(discountedCents(0, 25), 0, 'edge: 0 price stays 0');
assert.strictEqual(discountedCents(999, 0), 999, 'edge: 0% off is a no-op');
assert.strictEqual(discountedCents(100, 100), 0, 'edge: 100% off is free');
console.log('android-stub-logic: discountedCents fixed — failing test now passes + edges green');
