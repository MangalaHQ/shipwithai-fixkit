'use strict';
// VERIFICATION mirrors reproduction: the SAME boundary-log assertion, now against FIXED ->
// passes (exit zero). The boundary record IS the `instrumented-boundary` evidence.
const assert = require('assert');
const { handleAtBoundary } = require('./fixed');
const log = [];
handleAtBoundary({ method: 'GET', path: '/api/x/' }, log);
const rec = log[0];
assert.strictEqual(rec.normalizedPath, '/api/x',
  `boundary normalizedPath='${rec.normalizedPath}' (status ${rec.status})`);
console.log('backend-stub-integration verify: boundary log correct (normalizedPath=/api/x)');
