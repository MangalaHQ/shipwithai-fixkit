'use strict';
// shipwithai-fixkit-core — ledger state machine (the deterministic Phase-0 gate trust anchor).
//
// Two surfaces, ONE rule set:
//   validateLedger(snapshot)        -> {ok, violations[]}   : static INVARIANTS (audits a frozen ledger)
//   applyTransition(ledger, event)  -> {ok, ledger, violations[], fired?} : the GUARD the orchestrator calls
//
// Rule codes are the shared vocabulary cited by commands/fix.md and the skills.
// Zero dependencies. See lib/ledger.schema.md for the schema this enforces.

const STATES = [
  'open', 'reproduced', 'diagnosed', 'gated',
  'fixed', 'candidate', 'verified', 'closed', 'escalated',
];

// States that are only reachable AFTER a root cause exists (Iron Law, invariant form).
const POST_ROOTCAUSE_STATES = ['fixed', 'candidate', 'verified', 'closed'];

// Proof methods a given symptom layer may legitimately close/verify on.
// A rendered (UI) bug can never close on a source diff. (arch §7)
const LAYER_METHODS = {
  UI: ['browser-assertion', 'computed-style', 'dom-assertion', 'console-assertion', 'interaction-assertion'],
  Logic: ['test-run', 'failing-test-passes', 'unit-test'],
  System: ['instrumented-boundary', 'pipeline-run', 'ci-run', 'integration-test'],
};

function blank(v) {
  return v === undefined || v === null || String(v).trim() === '';
}
function verOf(l) {
  return (l && typeof l.verification === 'object' && l.verification) ? l.verification : {};
}
function tier(l) {
  return String(verOf(l).capability_tier || '').toUpperCase();
}
function clone(l) {
  return JSON.parse(JSON.stringify(l || {}));
}

// ---------------------------------------------------------------------------
// validateLedger — invariant auditor for a static ledger snapshot.
// ---------------------------------------------------------------------------
function validateLedger(l) {
  const v = [];
  const ver = verOf(l);
  const state = l.state;
  const count = Number(l['3_strikes_count'] || 0);

  if (state && !STATES.includes(state)) {
    v.push({ code: 'UNKNOWN_STATE', message: `unknown state '${state}'` });
  }
  // Iron Law (invariant form): no FIX-or-later state without a root cause.
  if (POST_ROOTCAUSE_STATES.includes(state) && blank(l.root_cause)) {
    v.push({ code: 'IRON_LAW_FIX_BEFORE_ROOT_CAUSE', message: `state '${state}' requires a non-empty root_cause` });
  }
  // Integrity rule: closed needs evidence AND a named verifier.
  if (state === 'closed') {
    if (blank(ver.evidence)) v.push({ code: 'INTEGRITY_EVIDENCE_EMPTY', message: 'closed requires non-empty verification.evidence' });
    if (blank(ver.verified_by)) v.push({ code: 'INTEGRITY_VERIFIER_MISSING', message: 'closed requires a named verification.verified_by' });
  }
  // ASSIST ceiling: no runner -> no auto-close -> handoff/v0 (max candidate).
  if (state === 'closed' && tier(l) === 'ASSIST') {
    v.push({ code: 'ASSIST_CANNOT_CLOSE', message: 'ASSIST capability_tier cannot reach closed (max candidate)' });
  }
  // Layer-proof binding: proof must match the symptom layer.
  if ((state === 'closed' || state === 'verified') && l.symptom_layer && !blank(ver.method)) {
    const allowed = LAYER_METHODS[l.symptom_layer];
    if (!allowed) {
      v.push({ code: 'UNKNOWN_LAYER', message: `unknown symptom_layer '${l.symptom_layer}' has no proof binding; cannot verify/close` });
    } else if (!allowed.includes(ver.method)) {
      v.push({ code: 'VERIFICATION_LAYER_MISMATCH', message: `${l.symptom_layer} bug cannot be proven by method '${ver.method}'` });
    }
  }
  // 3-strikes: an exhausted ledger must be escalated.
  if (count >= 3 && state !== 'escalated') {
    v.push({ code: 'THREE_STRIKES_NO_ESCALATION', message: '3_strikes_count >= 3 requires state escalated' });
  }
  return { ok: v.length === 0, violations: v };
}

// ---------------------------------------------------------------------------
// applyTransition — the guard the orchestrator gate calls. Checks BEFORE mutating.
// payload (optional): { ledger: {..fields..}, verification: {..fields..} } applied pre-check.
// ---------------------------------------------------------------------------
const PREDECESSORS = {
  enter_reproduced: ['open'],
  enter_diagnosed: ['reproduced'],
  enter_gated: ['diagnosed'],
  enter_fixed: ['diagnosed', 'gated'],
  enter_candidate: ['diagnosed', 'gated'],
  enter_verified: ['fixed', 'candidate'],
  close: ['verified'],
};

function applyTransition(ledger, event, payload) {
  const l = clone(ledger);
  l.verification = verOf(l);
  if (payload && typeof payload === 'object') {
    if (payload.ledger) Object.assign(l, payload.ledger);
    if (payload.verification) Object.assign(l.verification, payload.verification);
  }
  const cur = l.state;
  const refuse = (violations) => ({ ok: false, ledger: clone(ledger), violations });

  switch (event) {
    case 'record_fix_failure': {
      l['3_strikes_count'] = Number(l['3_strikes_count'] || 0) + 1;
      const fired = l['3_strikes_count'] >= 3;
      if (fired) l.state = 'escalated'; // 3-strikes FIRES escalation
      return { ok: true, ledger: l, violations: [], fired: fired ? 'escalated' : null };
    }
    case 'escalate': {
      l.state = 'escalated';
      return { ok: true, ledger: l, violations: [] };
    }
    case 'enter_fixed':
    case 'enter_candidate': {
      const v = [];
      if (!PREDECESSORS[event].includes(cur)) v.push({ code: 'ILLEGAL_TRANSITION', message: `cannot ${event} from '${cur}'` });
      if (blank(l.root_cause)) v.push({ code: 'IRON_LAW_FIX_BEFORE_ROOT_CAUSE', message: `${event} refused: root_cause is empty (Iron Law)` });
      if (event === 'enter_candidate' && tier(l) !== 'ASSIST') v.push({ code: 'CANDIDATE_REQUIRES_ASSIST', message: 'candidate state is only for ASSIST tier' });
      if (v.length) return refuse(v);
      l.state = event === 'enter_fixed' ? 'fixed' : 'candidate';
      return { ok: true, ledger: l, violations: [] };
    }
    case 'enter_verified': {
      const v = [];
      if (!PREDECESSORS.enter_verified.includes(cur)) v.push({ code: 'ILLEGAL_TRANSITION', message: `cannot enter_verified from '${cur}'` });
      // Defense-in-depth: the Iron Law also holds at verify (fixed/candidate are already gated).
      if (blank(l.root_cause)) v.push({ code: 'IRON_LAW_FIX_BEFORE_ROOT_CAUSE', message: 'enter_verified refused: root_cause is empty (Iron Law)' });
      if (v.length) return refuse(v);
      l.state = 'verified';
      return { ok: true, ledger: l, violations: [] };
    }
    case 'close': {
      const v = [];
      if (!PREDECESSORS.close.includes(cur)) v.push({ code: 'ILLEGAL_TRANSITION', message: `cannot close from '${cur}'` });
      if (blank(l.verification.evidence)) v.push({ code: 'INTEGRITY_EVIDENCE_EMPTY', message: 'close refused: verification.evidence is empty' });
      if (blank(l.verification.verified_by)) v.push({ code: 'INTEGRITY_VERIFIER_MISSING', message: 'close refused: verification.verified_by is missing' });
      if (tier(l) === 'ASSIST') v.push({ code: 'ASSIST_CANNOT_CLOSE', message: 'close refused: ASSIST tier (use handoff/v0 -> candidate)' });
      if (v.length) return refuse(v);
      l.state = 'closed';
      return { ok: true, ledger: l, violations: [] };
    }
    default: {
      if (PREDECESSORS[event]) {
        if (!PREDECESSORS[event].includes(cur)) return refuse([{ code: 'ILLEGAL_TRANSITION', message: `cannot ${event} from '${cur}'` }]);
        l.state = event.replace('enter_', '');
        return { ok: true, ledger: l, violations: [] };
      }
      return refuse([{ code: 'UNKNOWN_EVENT', message: `unknown event '${event}'` }]);
    }
  }
}

module.exports = { validateLedger, applyTransition, STATES, LAYER_METHODS };
