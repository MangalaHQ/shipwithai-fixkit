'use strict';
// VERIFICATION: the SAME assertion the reproduction used, now run against FIXED -> passes (exit 0).
// Mirror principle (doc 09 §7): a bug reproduced by a failing test is verified by that test passing
// + the suite staying green, never by a source diff. Extra edge assertions guard the boundary.
const assert = require('assert');
const { totalWithTipCents } = require('./fixed');
assert.strictEqual(totalWithTipCents(5000, 18), 5900, 'fixed: 18% tip on 5000c is 5900c');
assert.strictEqual(totalWithTipCents(0, 20), 0, 'edge: 0 bill stays 0');
assert.strictEqual(totalWithTipCents(1234, 0), 1234, 'edge: 0% tip is a no-op');
assert.strictEqual(totalWithTipCents(100, 100), 200, 'edge: 100% tip doubles');
console.log('ios-stub-logic: totalWithTipCents fixed — failing test now passes + edges green');
