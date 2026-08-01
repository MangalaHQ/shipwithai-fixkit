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
// Hard-lock pre-fix gate (Phase-1 seam), shared by every post-root-cause transition so the
// transition surface and the invariant auditor cannot drift. Returns a violation or null.
function hardLockViolation(l, event) {
  return (Array.isArray(l.hard_lock_violations) && l.hard_lock_violations.length)
    ? { code: 'HARD_LOCK_VIOLATION', message: `${event} refused: unresolved hard_lock_violations [${l.hard_lock_violations.join(', ')}] (resolve or escalate before fixing)` }
    : null;
}
// Cross-repo pre-fix gate (multi-repo design-system seam, Phase-0). Shared by the transition
// surface (enter_fixed/enter_candidate) and the invariant auditor so they cannot drift — the
// hard-lock precedent. A design-repo/both root cause must escalate + emit a cross-repo handoff,
// never enter a consumer post-fix state (fixed/candidate). Returns a violation or null.
function crossRepoConsumerViolation(l, event) {
  return (l.multi_repo === true && ['design-repo', 'both'].includes(l.fix_source))
    ? { code: 'CROSS_REPO_CONSUMER_EDIT', message: `${event} refused: fix_source '${l.fix_source}' owns the fix upstream — escalate and emit a cross-repo handoff, do not enter fixed/candidate in the consumer` }
    : null;
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
  // Fix-recorded (success path): a verified/closed bug must record WHAT change was applied.
  // Symmetric to the Iron Law (root_cause gates FIX-entry; fix gates VERIFY/CLOSE-entry).
  // Scoped to verified/closed so the ASSIST `candidate` and `escalated` paths are unaffected.
  if ((state === 'verified' || state === 'closed') && blank(l.fix)) {
    v.push({ code: 'FIX_NOT_RECORDED', message: `state '${state}' requires a non-empty fix (what change was applied)` });
  }
  // Hard-lock guard (Phase-1 seam): a post-fix ledger must not carry unresolved hard-lock
  // violations. Org packs populate hard_lock_violations pre-fix; an unresolved lock means the
  // fix should never have been applied (it must be resolved or the bug escalated first).
  if (POST_ROOTCAUSE_STATES.includes(state) && Array.isArray(l.hard_lock_violations) && l.hard_lock_violations.length) {
    v.push({ code: 'HARD_LOCK_VIOLATION', message: `state '${state}' must not carry unresolved hard_lock_violations [${l.hard_lock_violations.join(', ')}]` });
  }
  // Cross-repo fix_source guards (multi-repo design-system seam, Phase-0). Only active when
  // multi_repo === true (single-repo ledgers are byte-identical to legacy behaviour).
  // (1) Consistency invariant: fix_source ∈ {design-repo, both} ⇒ root_cause_layer == upstream.
  if (['design-repo', 'both'].includes(l.fix_source) && !blank(l.fix_source) && l.root_cause_layer !== 'upstream') {
    v.push({ code: 'FIXSOURCE_ROOTCAUSE_MISMATCH', message: `fix_source '${l.fix_source}' requires root_cause_layer 'upstream' (got '${l.root_cause_layer || ''}')` });
  }
  // (2) Pre-fix: a multi_repo bug cannot sit at a POST_ROOTCAUSE state without classifying fix_source.
  if (l.multi_repo === true && POST_ROOTCAUSE_STATES.includes(state) && blank(l.fix_source)) {
    v.push({ code: 'FIX_SOURCE_UNSET_MULTIREPO', message: `state '${state}' requires a non-empty fix_source when multi_repo is true` });
  }
  // (3) Consumer-edit invariant twin: a design-repo/both bug must not sit at a consumer post-fix state.
  if (l.multi_repo === true && ['design-repo', 'both'].includes(l.fix_source) && ['fixed', 'candidate'].includes(state)) {
    v.push({ code: 'CROSS_REPO_CONSUMER_EDIT', message: `fix_source '${l.fix_source}' must not sit at consumer post-fix state '${state}' — escalate and emit a cross-repo handoff` });
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
      // Hard-lock pre-fix gate (Phase-1 seam): an org pack populates hard_lock_violations before
      // the FIX step; a non-empty list blocks fixing until the lock is resolved or the bug escalated.
      { const hl = hardLockViolation(l, event); if (hl) v.push(hl); }
      // Cross-repo pre-fix gate (multi-repo seam): a design-repo/both bug must escalate, not fix here.
      { const xr = crossRepoConsumerViolation(l, event); if (xr) v.push(xr); }
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
      if (blank(l.fix)) v.push({ code: 'FIX_NOT_RECORDED', message: 'enter_verified refused: fix is empty (record the applied change)' });
      { const hl = hardLockViolation(l, 'enter_verified'); if (hl) v.push(hl); } // defense-in-depth
      if (v.length) return refuse(v);
      l.state = 'verified';
      return { ok: true, ledger: l, violations: [] };
    }
    case 'close': {
      const v = [];
      if (!PREDECESSORS.close.includes(cur)) v.push({ code: 'ILLEGAL_TRANSITION', message: `cannot close from '${cur}'` });
      if (blank(l.verification.evidence)) v.push({ code: 'INTEGRITY_EVIDENCE_EMPTY', message: 'close refused: verification.evidence is empty' });
      if (blank(l.verification.verified_by)) v.push({ code: 'INTEGRITY_VERIFIER_MISSING', message: 'close refused: verification.verified_by is missing' });
      if (blank(l.fix)) v.push({ code: 'FIX_NOT_RECORDED', message: 'close refused: fix is empty (record the applied change)' });
      if (tier(l) === 'ASSIST') v.push({ code: 'ASSIST_CANNOT_CLOSE', message: 'close refused: ASSIST tier (use handoff/v0 -> candidate)' });
      { const hl = hardLockViolation(l, 'close'); if (hl) v.push(hl); } // defense-in-depth
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
