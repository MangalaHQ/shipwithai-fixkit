'use strict';
// cross-repo-handoff/v0 — the remediation handoff the engine emits when a bug's root cause lives
// in a versioned design-system (DS) package rather than the consumer repo (fix_source ∈
// {design-repo, both}). It models "fix the DS package -> publish a bump -> bump the consumer dep"
// — a DIFFERENT shape from handoff/v0 (a verification handoff bound to LAYER_METHODS). Keeping it
// separate keeps each validator single-purpose and avoids weakening handoff/v0's assertion guard.
// Phase 0 only EMITS + surfaces this artifact; it does not execute the remediation.
// Zero dependencies. See lib/cross-repo-handoff.schema.md for the contract this enforces.

const FOLLOWUP = ['none', 'consumer'];

function blank(v) {
  return v === undefined || v === null || String(v).trim() === '';
}

// validateCrossRepoHandoff(h) -> { ok, violations[] }. Structural validation of the remediation
// handoff. All fields are required; pending_followup is a closed enum.
function validateCrossRepoHandoff(h) {
  const v = [];
  const H = (h && typeof h === 'object') ? h : {};

  if (H.version !== 'cross-repo-handoff/v0') {
    v.push({ code: 'XREPO_BAD_VERSION', message: `version must be 'cross-repo-handoff/v0' (got '${H.version}')` });
  }
  if (blank(H.bug_id)) {
    v.push({ code: 'XREPO_NO_BUG_ID', message: 'bug_id is required' });
  }
  if (blank(H.target_repo)) {
    v.push({ code: 'XREPO_NO_TARGET_REPO', message: 'target_repo is required (which DS repo owns the fix)' });
  }
  if (blank(H.root_cause_ref)) {
    v.push({ code: 'XREPO_NO_ROOT_CAUSE_REF', message: 'root_cause_ref is required (a pointer to the diagnosed root cause)' });
  }
  if (blank(H.remediation)) {
    v.push({ code: 'XREPO_NO_REMEDIATION', message: 'remediation is required (e.g. "fix DS -> publish <bump> -> bump consumer dep")' });
  }
  if (!Array.isArray(H.sequence) || H.sequence.length === 0) {
    v.push({ code: 'XREPO_NO_SEQUENCE', message: 'sequence must be a non-empty array of ordered remediation steps' });
  }
  if (!FOLLOWUP.includes(H.pending_followup)) {
    v.push({ code: 'XREPO_BAD_FOLLOWUP', message: `pending_followup must be one of ${FOLLOWUP.join('|')} (got '${H.pending_followup}')` });
  }
  return { ok: v.length === 0, violations: v };
}

module.exports = { validateCrossRepoHandoff };
