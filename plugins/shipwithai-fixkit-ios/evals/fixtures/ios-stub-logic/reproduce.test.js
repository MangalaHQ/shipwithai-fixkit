'use strict';
// REPRODUCTION: a failing automated test (the Logic reproduce idiom, doc 09 §7).
// Runs the expected behaviour against BUGGY -> fails (exit non-zero). The failing run IS the
// reproduction; its method analog is `failing-test-passes` once it goes green. On a real iOS project
// this is a host-runnable unit test under `swift test` / `xcodebuild test`; here it is Node.
const assert = require('assert');
const { totalWithTipCents } = require('./buggy');
const got = totalWithTipCents(5000, 18);
assert.strictEqual(got, 5900, `REPRODUCED: totalWithTipCents(5000, 18) returned ${got} (expected 5900)`);
console.log('unexpected: buggy totalWithTipCents already correct');
