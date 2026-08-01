'use strict';
// shipwithai-fixkit-core — the deterministic Phase-0 gate.
// CI runs:  cd plugins/shipwithai-fixkit-core && node tests/run-all.js
// Exit 0 = green (gate passes). Any failure exits non-zero (BLOCKING).
//
// Sections:
//   1. Parser unit tests (frontmatter edge cases) — a parser bug cannot yield a false green.
//   2. Acceptance #1 happy path        (validateLedger ACCEPTS)
//   3. Acceptance #2 integrity guard   (validateLedger REJECTS, invariant)
//   4. Acceptance #3 Iron-Law gate     (applyTransition REFUSES, transition guard)
//   5. Acceptance #4 3-strikes fires   (applyTransition x3 -> escalated, transition guard)
//   6. Honesty invariants              (ASSIST ceiling, layer-proof binding)
//   7. Convention + eval-schema linters (BLOCKING)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseFrontmatter, parseScalar } = require('./lib/frontmatter');
const { validateLedger, applyTransition } = require('../lib/ledger-validator');

const ROOT = path.join(__dirname, '..');                 // plugin root
const REPO = path.join(ROOT, '..', '..');                // repo root
const LEDGER_DIR = path.join(ROOT, 'evals', 'fixtures', 'ledger');
const SKILLS_DIR = path.join(ROOT, 'skills');
const AGENTS_DIR = path.join(ROOT, 'agents');

let pass = 0;
const failures = [];
function ok(name) { pass++; console.log(`  ✓ ${name}`); }
function fail(name, detail) { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
function assert(cond, name, detail) { cond ? ok(name) : fail(name, detail); }
function readLedger(file) { return parseFrontmatter(fs.readFileSync(path.join(LEDGER_DIR, file), 'utf8')); }
function hasCode(res, code) { return res.violations.some((x) => x.code === code); }
function section(t) { console.log(`\n${t}`); }

// 1. PARSER UNIT TESTS ------------------------------------------------------
section('1. Frontmatter parser unit tests');
{
  assert(parseScalar('') === '', 'bare empty -> empty string');
  assert(parseScalar('""') === '', 'quoted empty -> empty string');
  assert(parseScalar('3') === 3, 'unquoted 3 -> number');
  assert(parseScalar('"3"') === '3', 'quoted "3" -> string');
  assert(Array.isArray(parseScalar('[]')) && parseScalar('[]').length === 0, 'inline [] -> empty array');
  assert(parseScalar('null') === null, 'null -> null');
  const fm = parseFrontmatter('---\nid: X\nroot_cause:\n3_strikes_count: 2\nverification:\n  evidence: ""\n  capability_tier: FULL\nhard_lock_violations: []\n---\nbody');
  assert(fm.id === 'X', 'top-level scalar parsed');
  assert(fm.root_cause === '', 'empty top-level scalar -> empty string (not object)');
  assert(fm['3_strikes_count'] === 2, 'numeric field parsed');
  assert(typeof fm.verification === 'object' && fm.verification.capability_tier === 'FULL', 'nested verification object parsed');
  assert(fm.verification.evidence === '', 'nested quoted-empty evidence -> empty string');
  assert(Array.isArray(fm.hard_lock_violations), 'hard_lock_violations -> array');
  // The 3 new fix_source fields are all top-level scalars the existing parser already handles.
  const fm2 = parseFrontmatter('---\nmulti_repo: true\nfix_source: consumer\npending_followup: none\n---\nbody');
  assert(fm2.multi_repo === true, 'multi_repo: true -> bool (no parser change needed)');
  assert(fm2.fix_source === 'consumer', 'fix_source scalar -> string');
  assert(fm2.pending_followup === 'none', 'pending_followup scalar -> string');
}

// 2. ACCEPTANCE #1 — HAPPY PATH ---------------------------------------------
section('2. Acceptance #1 — happy-path lifecycle (runnable reproduce -> fix -> verify -> closed)');
{
  const stub = path.join(ROOT, 'evals', 'fixtures', 'stub-adapter');
  // Reproduce: the expected behaviour FAILS against the buggy module (exit non-zero).
  let reproduced = false;
  try { execFileSync(process.execPath, [path.join(stub, 'reproduce.test.js')], { stdio: 'pipe' }); }
  catch (e) { reproduced = true; }
  assert(reproduced, 'reproduce.test.js FAILS against buggy.js (the bug is reproduced)');
  // Verify: the expected behaviour PASSES against the fixed module (exit zero).
  let verified = false;
  try { execFileSync(process.execPath, [path.join(stub, 'verify.test.js')], { stdio: 'pipe' }); verified = true; }
  catch (e) { verified = false; }
  assert(verified, 'verify.test.js PASSES against fixed.js (the fix is verified)');
  // Close: the resulting ledger is internally consistent and reaches closed.
  const res = validateLedger(readLedger('happy-path.closed.md'));
  assert(res.ok, 'happy-path.closed.md is ACCEPTED (state closed, evidence + verifier present)', res.ok ? '' : JSON.stringify(res.violations));
}

// 3. ACCEPTANCE #2 — INTEGRITY GUARD (invariant) ----------------------------
section('3. Acceptance #2 — integrity guard blocks empty-evidence close');
{
  const res = validateLedger(readLedger('neg-integrity.empty-evidence.md'));
  assert(!res.ok && hasCode(res, 'INTEGRITY_EVIDENCE_EMPTY'),
    'empty-evidence close is REJECTED (INTEGRITY_EVIDENCE_EMPTY)', JSON.stringify(res.violations));
}

// 4. ACCEPTANCE #3 — IRON-LAW GATE (transition guard) -----------------------
section('4. Acceptance #3 — Iron-Law gate: fix before root_cause is refused');
{
  const seed = readLedger('seed-ironlaw.no-rootcause.md');
  const res = applyTransition(seed, 'enter_fixed');
  assert(!res.ok && hasCode(res, 'IRON_LAW_FIX_BEFORE_ROOT_CAUSE'),
    'enter_fixed is REFUSED while root_cause empty', JSON.stringify(res.violations));
  assert(res.ledger.state === 'diagnosed', 'state did not advance (still diagnosed)', res.ledger.state);
  // Control: once a root cause exists, the same transition is allowed.
  const allowed = applyTransition(seed, 'enter_fixed', { ledger: { root_cause: 'found it' } });
  assert(allowed.ok && allowed.ledger.state === 'fixed', 'enter_fixed allowed once root_cause present');
}

// 5. ACCEPTANCE #4 — 3-STRIKES FIRES (transition guard) ---------------------
section('5. Acceptance #4 — 3-strikes fires escalation after 3 failed fixes');
{
  let l = readLedger('seed-3strikes.diagnosed.md');
  assert(Number(l['3_strikes_count']) === 0, 'seed starts at count 0 (not pre-set)');
  const r1 = applyTransition(l, 'record_fix_failure'); l = r1.ledger;
  const r2 = applyTransition(l, 'record_fix_failure'); l = r2.ledger;
  const r3 = applyTransition(l, 'record_fix_failure'); l = r3.ledger;
  assert(!r1.fired && !r2.fired, 'no escalation before the 3rd failure');
  assert(Number(l['3_strikes_count']) === 3, 'counter reached 3 via the function', String(l['3_strikes_count']));
  assert(r3.fired === 'escalated' && l.state === 'escalated', '3rd failure FIRES state -> escalated', l.state);
  // And the invariant auditor agrees a count-3 non-escalated ledger is illegal.
  const bad = validateLedger({ state: 'fixed', root_cause: 'x', '3_strikes_count': 3 });
  assert(!bad.ok && hasCode(bad, 'THREE_STRIKES_NO_ESCALATION'), 'count>=3 without escalation is REJECTED');
}

// 6. HONESTY INVARIANTS -----------------------------------------------------
section('6. Honesty invariants — ASSIST ceiling + layer-proof binding');
{
  const a = validateLedger(readLedger('neg-assist.closed.md'));
  assert(!a.ok && hasCode(a, 'ASSIST_CANNOT_CLOSE'), 'ASSIST tier cannot close (ASSIST_CANNOT_CLOSE)', JSON.stringify(a.violations));
  const b = validateLedger(readLedger('neg-layerproof.ui-on-diff.md'));
  assert(!b.ok && hasCode(b, 'VERIFICATION_LAYER_MISMATCH'), 'UI bug cannot close on source-diff (VERIFICATION_LAYER_MISMATCH)', JSON.stringify(b.violations));
}

// 6b. CLOSE-PATH TRANSITION GUARDS (the runtime chokepoint the orchestrator calls) -----------
section('6b. close guard (transition surface) + fix-recorded');
{
  // A fully-satisfied verified ledger that `close` should accept.
  const okBase = () => ({
    state: 'verified', symptom_layer: 'Logic', root_cause: 'off-by-one', fix: 'seed accumulator at 0',
    verification: { method: 'test-run', capability_tier: 'FULL', evidence: 'suite green', verified_by: 'logic-bug-agent' },
  });
  const closeOf = (mut) => { const l = okBase(); mut(l); return applyTransition(l, 'close'); };

  const control = applyTransition(okBase(), 'close');
  assert(control.ok && control.ledger.state === 'closed', 'control: fully-satisfied close SUCCEEDS via applyTransition');

  const noEvidence = closeOf((l) => { l.verification.evidence = ''; });
  assert(!noEvidence.ok && hasCode(noEvidence, 'INTEGRITY_EVIDENCE_EMPTY'), 'close REFUSED on empty evidence (transition surface)', JSON.stringify(noEvidence.violations));

  const noVerifier = closeOf((l) => { l.verification.verified_by = ''; });
  assert(!noVerifier.ok && hasCode(noVerifier, 'INTEGRITY_VERIFIER_MISSING'), 'close REFUSED on missing verified_by (transition surface)', JSON.stringify(noVerifier.violations));

  const assist = closeOf((l) => { l.verification.capability_tier = 'ASSIST'; });
  assert(!assist.ok && hasCode(assist, 'ASSIST_CANNOT_CLOSE'), 'close REFUSED for ASSIST tier (transition surface)', JSON.stringify(assist.violations));

  // fix-recorded (F1): close and enter_verified refuse when `fix` is empty; auditor agrees.
  const noFixClose = closeOf((l) => { l.fix = ''; });
  assert(!noFixClose.ok && hasCode(noFixClose, 'FIX_NOT_RECORDED'), 'close REFUSED when fix is empty (FIX_NOT_RECORDED)', JSON.stringify(noFixClose.violations));

  const noFixVerify = applyTransition({ state: 'fixed', root_cause: 'rc', fix: '', verification: {} }, 'enter_verified');
  assert(!noFixVerify.ok && hasCode(noFixVerify, 'FIX_NOT_RECORDED'), 'enter_verified REFUSED when fix is empty (FIX_NOT_RECORDED)', JSON.stringify(noFixVerify.violations));

  const auditNoFix = validateLedger({ state: 'closed', symptom_layer: 'Logic', root_cause: 'rc', fix: '', verification: { method: 'test-run', capability_tier: 'FULL', evidence: 'e', verified_by: 'v' } });
  assert(!auditNoFix.ok && hasCode(auditNoFix, 'FIX_NOT_RECORDED'), 'validateLedger flags closed-without-fix (FIX_NOT_RECORDED)', JSON.stringify(auditNoFix.violations));
}

// 6c. HARD-LOCK PRE-FIX GUARD (Phase-1 seam: hard_lock_violations) ----------
section('6c. hard-lock pre-fix guard (Phase-1 seam)');
{
  const diagnosed = { state: 'diagnosed', symptom_layer: 'UI', root_cause: 'rc', verification: {} };
  // A pending hard-lock violation BLOCKS the fix transition (pre-fix enforcement).
  const blocked = applyTransition(diagnosed, 'enter_fixed', { ledger: { hard_lock_violations: ['data-surface-removed'] } });
  assert(!blocked.ok && hasCode(blocked, 'HARD_LOCK_VIOLATION'), 'enter_fixed REFUSED with non-empty hard_lock_violations (blocked pre-fix)', JSON.stringify(blocked.violations));
  assert(blocked.ledger.state === 'diagnosed', 'state did not advance past diagnosed when hard-lock pending', blocked.ledger.state);
  // enter_candidate (ASSIST path) is likewise blocked pre-fix.
  const blockedC = applyTransition({ ...diagnosed, verification: { capability_tier: 'ASSIST' } }, 'enter_candidate', { ledger: { hard_lock_violations: ['url-mutated'] } });
  assert(!blockedC.ok && hasCode(blockedC, 'HARD_LOCK_VIOLATION'), 'enter_candidate REFUSED with non-empty hard_lock_violations', JSON.stringify(blockedC.violations));
  // Control: an empty lock list allows the fix to proceed.
  const allowed = applyTransition(diagnosed, 'enter_fixed', { ledger: { hard_lock_violations: [] } });
  assert(allowed.ok && allowed.ledger.state === 'fixed', 'enter_fixed allowed when hard_lock_violations empty (control)', JSON.stringify(allowed.violations));
  // Auditor agrees: a post-fix ledger carrying an unresolved lock is illegal.
  const audit = validateLedger({ state: 'fixed', symptom_layer: 'UI', root_cause: 'rc', fix: 'f', hard_lock_violations: ['data-surface-removed'] });
  assert(!audit.ok && hasCode(audit, 'HARD_LOCK_VIOLATION'), 'validateLedger flags fixed-with-unresolved-hard-lock', JSON.stringify(audit.violations));
  // Defense-in-depth: a lock that somehow survives into a later state still blocks verify AND close
  // on the transition surface (not only the invariant auditor).
  const vBlocked = applyTransition({ state: 'fixed', symptom_layer: 'UI', root_cause: 'rc', fix: 'f', hard_lock_violations: ['data-surface'], verification: {} }, 'enter_verified');
  assert(!vBlocked.ok && hasCode(vBlocked, 'HARD_LOCK_VIOLATION'), 'enter_verified REFUSED with non-empty hard_lock_violations (defense-in-depth)', JSON.stringify(vBlocked.violations));
  const cBlocked = applyTransition({ state: 'verified', symptom_layer: 'Logic', root_cause: 'rc', fix: 'f', hard_lock_violations: ['data-surface'], verification: { method: 'test-run', capability_tier: 'FULL', evidence: 'e', verified_by: 'v' } }, 'close');
  assert(!cBlocked.ok && hasCode(cBlocked, 'HARD_LOCK_VIOLATION'), 'close REFUSED with non-empty hard_lock_violations (defense-in-depth)', JSON.stringify(cBlocked.violations));
}

// 6d. HANDOFF/v0 FORMAT (ASSIST verification handoff; P3/P4 inherit it) ------
section('6d. handoff/v0 format + layer-proof binding');
{
  const { validateHandoff } = require('../lib/handoff-validator');
  const valid = {
    version: 'handoff/v0', bug_id: 'BUG-0003', symptom_layer: 'UI',
    target: { env: 'local-dev', url: 'http://localhost:4321/blog/x', device: 'desktop', viewport: '1280x800' },
    steps: ['open URL', 'measure the pre element'],
    assertion: { method: 'computed-style', expected: 'scrollWidth <= clientWidth on pre' },
    verified_by: null,
  };
  const okH = validateHandoff(valid);
  assert(okH.ok, 'a complete handoff/v0 (verified_by:null) is ACCEPTED', JSON.stringify(okH.violations));

  const noAssert = validateHandoff(Object.assign({}, valid, { assertion: undefined }));
  assert(!noAssert.ok && noAssert.violations.some((x) => x.code === 'HANDOFF_NO_ASSERTION'), 'handoff missing assertion is REJECTED', JSON.stringify(noAssert.violations));

  const badMethod = validateHandoff(Object.assign({}, valid, { assertion: { method: 'test-run', expected: 'x' } }));
  assert(!badMethod.ok && badMethod.violations.some((x) => x.code === 'HANDOFF_LAYER_MISMATCH'), 'UI handoff with a non-UI proof method is REJECTED (layer binding)', JSON.stringify(badMethod.violations));

  const noSlot = validateHandoff({ version: 'handoff/v0', bug_id: 'B', symptom_layer: 'UI', target: { env: 'e' }, steps: ['s'], assertion: { method: 'computed-style', expected: 'x' } });
  assert(!noSlot.ok && noSlot.violations.some((x) => x.code === 'HANDOFF_NO_VERIFIED_BY_SLOT'), 'handoff missing the verified_by slot is REJECTED', JSON.stringify(noSlot.violations));
}

// 6e. PATTERN MINER (recurring-pattern discovery; loud failure; mutation) ---
section('6e. Pattern miner — structural scope-token clustering');
{
  const { mineDir, mineLedgers } = require('../lib/pattern-miner');
  const PATTERN_DIR = path.join(ROOT, 'evals', 'fixtures', 'pattern', 'cluster');
  const MALFORMED_DIR = path.join(ROOT, 'evals', 'fixtures', 'pattern', 'malformed');

  // (1) a recurring pair surfaces at threshold 2; the unique-signature noise and the
  //     no-scope-token negative control stay OUT (one fixture set, three assertions).
  const r2 = mineDir(PATTERN_DIR, { threshold: 2 });
  assert(r2.candidates.length === 1, 'one candidate pattern at threshold 2', `got ${r2.candidates.length}`);
  const cand = r2.candidates[0] || { bug_ids: [], shared_scope_tokens: [] };
  assert(cand.bug_ids.join(',') === 'BUG-9001,BUG-9002', 'candidate = the recurring pair', cand.bug_ids.join(','));
  assert(cand.shared_scope_tokens.includes('@acme/widgets'), 'cluster is bound by the shared scope token', JSON.stringify(cand.shared_scope_tokens));
  const surfaced = new Set(r2.candidates.flatMap((c) => c.bug_ids));
  assert(!surfaced.has('BUG-9003'), 'sub-threshold unique-signature noise does NOT surface');
  assert(!surfaced.has('BUG-9004'), 'negative control (no scope token) does NOT cluster');

  // (2) malformed ledger fails LOUDLY (throws) — never a silent skip (the PR #3 lesson).
  let threw = false;
  try { mineDir(MALFORMED_DIR, { threshold: 2 }); } catch (e) { threw = /malformed ledger/.test(e.message); }
  assert(threw, 'a malformed ledger throws (loud failure, not a silent skip)');

  // (3) MUTATION — raise the threshold to 3: the pair-of-2 must STOP surfacing (the test bites).
  const r3 = mineDir(PATTERN_DIR, { threshold: 3 });
  assert(r3.candidates.length === 0, 'mutation: threshold 3 drops the pair-of-2 (gate bites)', `got ${r3.candidates.length}`);

  // (4) MUTATION — the structural scope token is load-bearing: strip it from one member and the
  //     cluster dissolves (proves matching is not happening on salient tokens alone).
  const pair = [
    { id: 'X1', symptom_layer: 'UI', root_cause: 'the @acme/widgets Carousel organism mis-times its slide padding' },
    { id: 'X2', symptom_layer: 'UI', root_cause: 'the @acme/widgets Carousel organism stacks slide padding' },
  ];
  assert(mineLedgers(pair, { threshold: 2 }).candidates.length === 1, 'control: scoped pair clusters');
  const stripped = [pair[0], { id: 'X2', symptom_layer: 'UI', root_cause: 'the carousel organism stacks slide padding (no package ref, no backtick)' }];
  assert(mineLedgers(stripped, { threshold: 2 }).candidates.length === 0, 'mutation: removing the scope token dissolves the cluster');

  // (5) the optional curated boost is INERT by default (core must pass with the boost absent) and
  //     only re-ranks when supplied — it never changes membership but DOES change the score.
  const noBoost = mineLedgers(pair, { threshold: 2 });
  const withBoost = mineLedgers(pair, { threshold: 2, boostVocabulary: ['carousel'] });
  assert(withBoost.candidates.length === 1, 'boost does not change cluster membership (re-rank only)');
  assert(withBoost.candidates[0].score > noBoost.candidates[0].score, 'boost re-ranks: a boosted shared token raises the candidate score');

  // (6) FREQUENCY COUNTS DISTINCT BUG IDS, not member files — a duplicated/superseded id must not
  //     inflate a pattern (the honesty clause). Three files, two distinct ids, at threshold 3 -> none.
  const dupIds = [
    { id: 'DUP-1', symptom_layer: 'UI', root_cause: 'the @acme/widgets Carousel organism stacks slide padding' },
    { id: 'DUP-1', symptom_layer: 'UI', root_cause: 'the @acme/widgets Carousel organism stacks slide padding (reopened)' },
    { id: 'DUP-2', symptom_layer: 'UI', root_cause: 'the @acme/widgets Carousel organism mis-times its slide' },
  ];
  const dupR = mineLedgers(dupIds, { threshold: 3 });
  assert(dupR.candidates.length === 0, 'distinct-id: 3 files / 2 distinct ids does NOT meet threshold 3');
  const dupR2 = mineLedgers(dupIds, { threshold: 2 });
  assert(dupR2.candidates.length === 1 && dupR2.candidates[0].count === 2 &&
    dupR2.candidates[0].bug_ids.join(',') === 'DUP-1,DUP-2',
    'distinct-id: count + cited bug_ids are deduped to the 2 distinct ids', JSON.stringify(dupR2.candidates[0] && dupR2.candidates[0].bug_ids));
}

// 6f. CROSS-REPO fix_source GUARDS (multi-repo design-system seam) ----------
section('6f. cross-repo fix_source guards (multi_repo classification)');
{
  // (1) The 3 negatives REJECT with the right code (invariant surface, static fixtures).
  const unset = validateLedger(readLedger('neg-fixsource.unset-multirepo.md'));
  assert(!unset.ok && hasCode(unset, 'FIX_SOURCE_UNSET_MULTIREPO'),
    'multi_repo post-root-cause with empty fix_source is REJECTED (FIX_SOURCE_UNSET_MULTIREPO)', JSON.stringify(unset.violations));

  const edit = validateLedger(readLedger('neg-crossrepo.consumer-edit.md'));
  assert(!edit.ok && hasCode(edit, 'CROSS_REPO_CONSUMER_EDIT'),
    'design-repo fix_source at a consumer post-fix state is REJECTED (CROSS_REPO_CONSUMER_EDIT)', JSON.stringify(edit.violations));

  const mismatch = validateLedger(readLedger('neg-fixsource.rootcause-mismatch.md'));
  assert(!mismatch.ok && hasCode(mismatch, 'FIXSOURCE_ROOTCAUSE_MISMATCH'),
    'design-repo fix_source with non-upstream root_cause_layer is REJECTED (FIXSOURCE_ROOTCAUSE_MISMATCH)', JSON.stringify(mismatch.violations));

  // (2) The 2 happies ACCEPT (correct off-ramp; both keeps pending_followup).
  const esc = validateLedger(readLedger('crossrepo.escalated.md'));
  assert(esc.ok, 'happy design-repo escalated is ACCEPTED', JSON.stringify(esc.violations));
  const both = validateLedger(readLedger('crossrepo.both-followup.md'));
  assert(both.ok, 'happy both escalated + pending_followup:consumer is ACCEPTED', JSON.stringify(both.violations));

  // (3) Negative control (AC6): single-repo (multi_repo:false) does NOT regress — none of the
  //     3 new codes fire even though fix_source is blank at a POST_ROOTCAUSE state.
  const single = validateLedger({ state: 'fixed', root_cause: 'rc', fix: 'f', multi_repo: false, fix_source: '', hard_lock_violations: [] });
  assert(!hasCode(single, 'FIX_SOURCE_UNSET_MULTIREPO') && !hasCode(single, 'CROSS_REPO_CONSUMER_EDIT') && !hasCode(single, 'FIXSOURCE_ROOTCAUSE_MISMATCH'),
    'single-repo control: no new guard fires (multi_repo:false)', JSON.stringify(single.violations));

  // (4) MUTATION — FIX_SOURCE_UNSET_MULTIREPO is load-bearing on multi_repo === true: flip the gate
  //     off (multi_repo:false, same otherwise) and the REJECT becomes ACCEPT for that code.
  const mUnsetOff = validateLedger({ state: 'fixed', root_cause: 'rc', fix: 'f', multi_repo: false, fix_source: '', hard_lock_violations: [] });
  assert(!hasCode(mUnsetOff, 'FIX_SOURCE_UNSET_MULTIREPO'),
    'mutation: flipping multi_repo off flips FIX_SOURCE_UNSET_MULTIREPO REJECT->ACCEPT (guard bites)');
  // Second control: multi_repo:true with fix_source set -> ACCEPT (the field is what satisfies it).
  const mUnsetSet = validateLedger({ state: 'fixed', root_cause: 'rc', fix: 'f', multi_repo: true, fix_source: 'consumer', hard_lock_violations: [] });
  assert(!hasCode(mUnsetSet, 'FIX_SOURCE_UNSET_MULTIREPO'), 'control: multi_repo with fix_source:consumer does not fire the unset guard');

  // (5) MUTATION — FIXSOURCE_ROOTCAUSE_MISMATCH is load-bearing on root_cause_layer: set it to
  //     'upstream' (same otherwise) and the REJECT becomes ACCEPT for that code.
  const mMismatchFixed = validateLedger({ state: 'diagnosed', root_cause: 'rc', multi_repo: true, fix_source: 'design-repo', root_cause_layer: 'upstream', hard_lock_violations: [] });
  assert(!hasCode(mMismatchFixed, 'FIXSOURCE_ROOTCAUSE_MISMATCH'),
    'mutation: root_cause_layer:upstream flips FIXSOURCE_ROOTCAUSE_MISMATCH REJECT->ACCEPT (guard bites)');

  // (6) CROSS_REPO_CONSUMER_EDIT transition surface: a design-repo ledger cannot enter_fixed in the
  //     consumer — REFUSED, state stays diagnosed.
  const xrSeed = { state: 'diagnosed', root_cause: 'rc', multi_repo: true, fix_source: 'design-repo', root_cause_layer: 'upstream', verification: {} };
  const xrFixed = applyTransition(xrSeed, 'enter_fixed');
  assert(!xrFixed.ok && hasCode(xrFixed, 'CROSS_REPO_CONSUMER_EDIT'), 'enter_fixed REFUSED for design-repo (transition surface)', JSON.stringify(xrFixed.violations));
  assert(xrFixed.ledger.state === 'diagnosed', 'state did not advance past diagnosed (cross-repo block)', xrFixed.ledger.state);

  // (7) MUTATION — CROSS_REPO_CONSUMER_EDIT is load-bearing on fix_source: with fix_source:consumer
  //     the SAME enter_fixed SUCCEEDS (REFUSE->ACCEPT), proving the field bites.
  const mConsumer = applyTransition({ ...xrSeed, fix_source: 'consumer', root_cause_layer: 'Logic' }, 'enter_fixed');
  assert(mConsumer.ok && mConsumer.ledger.state === 'fixed', 'mutation: fix_source:consumer lets enter_fixed SUCCEED (guard bites)', JSON.stringify(mConsumer.violations));

  // (8) The correct off-ramp is not a dead end: escalate on the same design-repo ledger SUCCEEDS.
  const xrEsc = applyTransition(xrSeed, 'escalate');
  assert(xrEsc.ok && xrEsc.ledger.state === 'escalated', 'design-repo ledger CAN escalate (correct off-ramp, not a dead end)', JSON.stringify(xrEsc.violations));
}

// 6g. CROSS-REPO-HANDOFF/v0 FORMAT (remediation handoff; distinct from handoff/v0) ------
section('6g. cross-repo-handoff/v0 format');
{
  const { validateCrossRepoHandoff } = require('../lib/cross-repo-handoff-validator');
  const valid = {
    version: 'cross-repo-handoff/v0', bug_id: 'BUG-0104',
    target_repo: '@mangalahq/shipwithai-sot-design', root_cause_ref: '.fixkit/BUG-0104.md',
    remediation: 'fix DS token map -> publish minor -> bump consumer dep',
    sequence: ['fix --sl-color-tip-* map in DS', 'publish 1.4.0', 'bump consumer dep to 1.4.0'],
    pending_followup: 'consumer',
  };
  const okX = validateCrossRepoHandoff(valid);
  assert(okX.ok, 'a complete cross-repo-handoff/v0 is ACCEPTED', JSON.stringify(okX.violations));

  const noTarget = validateCrossRepoHandoff(Object.assign({}, valid, { target_repo: '' }));
  assert(!noTarget.ok && noTarget.violations.some((x) => x.code === 'XREPO_NO_TARGET_REPO'), 'missing target_repo is REJECTED', JSON.stringify(noTarget.violations));

  const badSeq = validateCrossRepoHandoff(Object.assign({}, valid, { sequence: [] }));
  assert(!badSeq.ok && badSeq.violations.some((x) => x.code === 'XREPO_NO_SEQUENCE'), 'empty sequence is REJECTED', JSON.stringify(badSeq.violations));

  const badVer = validateCrossRepoHandoff(Object.assign({}, valid, { version: 'handoff/v0' }));
  assert(!badVer.ok && badVer.violations.some((x) => x.code === 'XREPO_BAD_VERSION'), 'wrong version is REJECTED', JSON.stringify(badVer.violations));

  const badFollowup = validateCrossRepoHandoff(Object.assign({}, valid, { pending_followup: 'maybe' }));
  assert(!badFollowup.ok && badFollowup.violations.some((x) => x.code === 'XREPO_BAD_FOLLOWUP'), 'bad pending_followup enum is REJECTED', JSON.stringify(badFollowup.violations));
}

// 7. CONVENTION + EVAL-SCHEMA LINTERS (BLOCKING) ----------------------------
section('7. Convention + eval-schema linters');
function walkSkillFiles() {
  const out = [];
  if (!fs.existsSync(SKILLS_DIR)) return out;
  for (const s of fs.readdirSync(SKILLS_DIR)) {
    const skillMd = path.join(SKILLS_DIR, s, 'SKILL.md');
    if (fs.existsSync(skillMd)) out.push({ skill: s, file: skillMd });
  }
  return out;
}
function lastH2(text) {
  const m = text.match(/^##[^#].*$/gm);
  return m ? m[m.length - 1] : null;
}
function maxFencedBlock(text) {
  const lines = text.split(/\r?\n/);
  let inBlock = false, len = 0, max = 0;
  for (const ln of lines) {
    if (/^\s*```/.test(ln)) {
      if (inBlock) { max = Math.max(max, len); inBlock = false; len = 0; }
      else { inBlock = true; len = 0; }
    } else if (inBlock) { len++; }
  }
  return max;
}

const skills = walkSkillFiles();
assert(skills.length >= 4, 'at least 4 skills present', String(skills.length));

// 7a. "What this does NOT do" + line + inline-code limits for skills
let subSkillCount = 0;
for (const { skill, file } of skills) {
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/).length;
  const h2 = lastH2(text);
  assert(h2 && /what this .*does not do/i.test(h2), `${skill}/SKILL.md ends with "## What this ... does NOT do"`, h2 || 'none');
  assert(lines < 200, `${skill}/SKILL.md < 200 lines`, String(lines));
  const blk = maxFencedBlock(text);
  assert(blk <= 20, `${skill}/SKILL.md inline-code <= 20 lines`, `max block ${blk}`);
  const fm = parseFrontmatter(text);
  assert(typeof fm.description === 'string' && fm.description.length < 200, `${skill}/SKILL.md description < 200 chars`, `${(fm.description || '').length}`);
  if (fm['user-invocable'] === false) subSkillCount++;
}
assert(subSkillCount >= 1, 'at least 1 skill is a user-invocable:false sub-skill (check #7 composition)', String(subSkillCount));

// 7b. agents end with "## What this agent does NOT do"
if (fs.existsSync(AGENTS_DIR)) {
  for (const a of fs.readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.md'))) {
    const text = fs.readFileSync(path.join(AGENTS_DIR, a), 'utf8');
    const h2 = lastH2(text);
    assert(h2 && /what this agent does not do/i.test(h2), `agents/${a} ends with "## What this agent does NOT do"`, h2 || 'none');
  }
}

// 7c. references < 150 lines (if any)
for (const { skill } of skills) {
  const refDir = path.join(SKILLS_DIR, skill, 'references');
  if (!fs.existsSync(refDir)) continue;
  for (const r of fs.readdirSync(refDir).filter((f) => f.endsWith('.md'))) {
    const n = fs.readFileSync(path.join(refDir, r), 'utf8').split(/\r?\n/).length;
    assert(n < 150, `references/${r} < 150 lines`, String(n));
  }
}

// 7d. eval schema: >=5 objects, >=3 trigger / >=2 must-not, required fields
for (const { skill } of skills) {
  const ej = path.join(SKILLS_DIR, skill, 'evals', 'evals.json');
  if (!fs.existsSync(ej)) { fail(`${skill} has evals/evals.json`); continue; }
  let data;
  try { data = JSON.parse(fs.readFileSync(ej, 'utf8')); } catch (e) { fail(`${skill} evals.json valid JSON`, e.message); continue; }
  const evals = Array.isArray(data.evals) ? data.evals : [];
  assert(evals.length >= 5, `${skill} evals: >= 5 prompts`, String(evals.length));
  const shaped = evals.every((e) => e && e.id && e.prompt && e.expectedBehavior && e.category && typeof e.shouldTrigger === 'boolean');
  assert(shaped, `${skill} evals: every object has {id,prompt,expectedBehavior,category,shouldTrigger}`);
  const trig = evals.filter((e) => e.shouldTrigger === true).length;
  const must = evals.filter((e) => e.shouldTrigger === false).length;
  assert(trig >= 3 && must >= 2, `${skill} evals: >=3 trigger / >=2 must-not-trigger`, `trigger=${trig} must-not=${must}`);
}

// 7e. 4-key version sync
{
  const pj = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8'));
  const pm = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin', 'marketplace.json'), 'utf8'));
  const rootMktPath = path.join(REPO, '.claude-plugin', 'marketplace.json');
  const v1 = pj.version;
  const v2 = pm.version;
  const v3 = (pm.plugins && pm.plugins[0] && pm.plugins[0].version);
  let v4 = 'MISSING';
  if (fs.existsSync(rootMktPath)) {
    const rm = JSON.parse(fs.readFileSync(rootMktPath, 'utf8'));
    const match = (rm.plugins || []).find((p) => p.name === pj.name);
    v4 = match ? match.version : 'NOT_FOUND';
  }
  assert(v1 && v1 === v2 && v1 === v3 && v1 === v4,
    '4-key version sync (plugin.json == per-plugin top == per-plugin plugins[0] == root)',
    `plugin=${v1} mkt-top=${v2} mkt-plugins0=${v3} root=${v4}`);
}

// SUMMARY -------------------------------------------------------------------
console.log(`\n${'='.repeat(60)}`);
if (failures.length === 0) {
  console.log(`PASS — ${pass} checks green. Phase-0 gate satisfied.`);
  process.exit(0);
} else {
  console.log(`FAIL — ${failures.length} failing, ${pass} passing:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
