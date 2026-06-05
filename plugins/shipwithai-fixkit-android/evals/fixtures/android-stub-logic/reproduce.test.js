'use strict';
// REPRODUCTION: a failing automated test (the Logic reproduce idiom, doc 09 §7).
// Runs the expected behaviour against BUGGY -> fails (exit non-zero). The failing run IS the
// reproduction; its method analog is `failing-test-passes` once it goes green. On a real Android
// project this is a JVM unit test under ./gradlew testDebugUnitTest; here it is host-runnable Node.
const assert = require('assert');
const { discountedCents } = require('./buggy');
const got = discountedCents(2000, 10);
assert.strictEqual(got, 1800, `REPRODUCED: discountedCents(2000, 10) returned ${got} (expected 1800)`);
console.log('unexpected: buggy discountedCents already correct');
