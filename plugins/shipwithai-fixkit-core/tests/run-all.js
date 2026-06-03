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
