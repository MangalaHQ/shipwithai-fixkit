'use strict';
// REPRODUCTION: instrument the boundary, then assert the boundary record is correct.
// Runs against BUGGY -> fails (exit non-zero). The failing boundary assertion IS the
// reproduction; its method analog is `instrumented-boundary`.
const assert = require('assert');
const { handleAtBoundary } = require('./buggy');
const log = [];
handleAtBoundary({ method: 'GET', path: '/api/x/' }, log);
const rec = log[0];
assert.strictEqual(rec.normalizedPath, '/api/x',
  `REPRODUCED: boundary logged normalizedPath='${rec.normalizedPath}' (expected '/api/x')`);
console.log('unexpected: buggy boundary already normalized');
