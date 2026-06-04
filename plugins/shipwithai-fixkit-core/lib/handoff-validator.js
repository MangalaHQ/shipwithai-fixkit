'use strict';
// handoff/v0 — the minimal verification handoff the engine emits when a layer is ASSIST
// (the agent can build/diagnose but cannot OBSERVE the running result). A verification
// provider (Cowork via browser, a CI snapshot, a device farm, or a human following the
// protocol) fills `verified_by` + the observed evidence; only then may the ledger advance
// past `candidate`. Defined now (Phase 1) so P3/P4 inherit ONE format. Zero dependencies.
// See lib/handoff.schema.md for the contract this enforces.

const { LAYER_METHODS } = require('./ledger-validator');

const LAYERS = ['UI', 'Logic', 'System'];

function blank(v) {
  return v === undefined || v === null || String(v).trim() === '';
}

// validateHandoff(h) -> { ok, violations[] }. Validates structure + the layer-proof binding
// (an assertion.method must be a legitimate proof for the handoff's symptom_layer — the same
// rule the ledger close-path enforces, so a handoff cannot promise a proof the ledger rejects).
function validateHandoff(h) {
  const v = [];
  const H = (h && typeof h === 'object') ? h : {};

  if (H.version !== 'handoff/v0') {
    v.push({ code: 'HANDOFF_BAD_VERSION', message: `version must be 'handoff/v0' (got '${H.version}')` });
  }
  if (blank(H.bug_id)) {
    v.push({ code: 'HANDOFF_NO_BUG_ID', message: 'bug_id is required' });
  }
  if (!LAYERS.includes(H.symptom_layer)) {
    v.push({ code: 'HANDOFF_BAD_LAYER', message: `symptom_layer must be one of ${LAYERS.join('|')}` });
  }
  // target.env tells the provider WHERE to observe (e.g. local-dev:4321, prod, ci-snapshot).
  const target = (H.target && typeof H.target === 'object') ? H.target : null;
  if (!target || blank(target.env)) {
    v.push({ code: 'HANDOFF_NO_TARGET_ENV', message: 'target.env is required (where to observe the result)' });
  }
  // steps: at least one ordered reproduction/observation action.
  if (!Array.isArray(H.steps) || H.steps.length === 0) {
    v.push({ code: 'HANDOFF_NO_STEPS', message: 'steps must be a non-empty array of ordered actions' });
  }
  // assertion: a layer-appropriate proof method + the expected observable result.
  const a = (H.assertion && typeof H.assertion === 'object') ? H.assertion : null;
  if (!a) {
    v.push({ code: 'HANDOFF_NO_ASSERTION', message: 'assertion { method, expected } is required' });
  } else {
    const allowed = LAYER_METHODS[H.symptom_layer];
    if (allowed && !allowed.includes(a.method)) {
      v.push({ code: 'HANDOFF_LAYER_MISMATCH', message: `assertion.method '${a.method}' is not a ${H.symptom_layer} proof (allowed: ${allowed.join(', ')})` });
    }
    if (blank(a.expected)) {
      v.push({ code: 'HANDOFF_NO_EXPECTED', message: 'assertion.expected is required (the observable that proves the fix)' });
    }
  }
  // verified_by is the slot a provider fills. It MUST exist as a key (null until verified):
  // an unfilled handoff is a valid request; a filled one is what lets the ledger close.
  if (!('verified_by' in H)) {
    v.push({ code: 'HANDOFF_NO_VERIFIED_BY_SLOT', message: 'verified_by slot must be present (null until a provider verifies)' });
  }
  return { ok: v.length === 0, violations: v };
}

module.exports = { validateHandoff };
