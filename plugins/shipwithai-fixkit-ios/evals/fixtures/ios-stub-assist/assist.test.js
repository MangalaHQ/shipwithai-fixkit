'use strict';
// The ASSIST "lifecycle" for iOS. A SwiftUI/UIKit UI bug cannot be OBSERVED from the host (no device
// connector), so there is no failing->passing test. The correct outcome is:
//   GREEN  the emitted handoff/v0 is a VALID request (validateHandoff ok)
//   GREEN  the ASSIST UI ledger at `candidate` is ACCEPTED (validateLedger ok)
//   RED    the same ledger forced to `closed` is REFUSED with ASSIST_CANNOT_CLOSE
// All three must hold (exit 0) — proving the engine emits a handoff and stops at candidate, and
// never auto-closes a UI bug. Validated by CORE's real validators (read-only reuse; zero copies).
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const CORE = path.resolve(__dirname, '../../../../shipwithai-fixkit-core/lib');
const { validateHandoff } = require(path.join(CORE, 'handoff-validator.js'));
const { validateLedger } = require(path.join(CORE, 'ledger-validator.js'));

const handoff = JSON.parse(fs.readFileSync(path.join(__dirname, 'handoff.json'), 'utf8'));
const candidate = JSON.parse(fs.readFileSync(path.join(__dirname, 'ledger.candidate.json'), 'utf8'));

// GREEN 1: the emitted handoff is a valid request (verified_by: null is fine).
const h = validateHandoff(handoff);
assert.ok(h.ok, `handoff/v0 must validate, got: ${JSON.stringify(h.violations)}`);

// GREEN 2: the ASSIST UI ledger at candidate is accepted.
const c = validateLedger(candidate);
assert.ok(c.ok, `ASSIST UI candidate must validate, got: ${JSON.stringify(c.violations)}`);

// RED: force closed (with evidence + verifier filled, so ASSIST_CANNOT_CLOSE is the ceiling, not a
// missing-evidence side effect). The ASSIST tier must still block closed.
const forcedClosed = JSON.parse(JSON.stringify(candidate));
forcedClosed.state = 'closed';
forcedClosed.verification.evidence = 'provider report attached';
forcedClosed.verification.verified_by = 'cowork';
const r = validateLedger(forcedClosed);
assert.ok(!r.ok && r.violations.some((v) => v.code === 'ASSIST_CANNOT_CLOSE'),
  `ASSIST forced-closed must be refused with ASSIST_CANNOT_CLOSE, got: ${JSON.stringify(r.violations)}`);

console.log('ios-stub-assist: handoff valid + candidate accepted + closed refused (ASSIST ceiling holds)');
