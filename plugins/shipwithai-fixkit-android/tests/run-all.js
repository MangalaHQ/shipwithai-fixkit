'use strict';
// shipwithai-fixkit-android — the deterministic blocking gate for the Android adapter.
// Run from the repo root:  node plugins/shipwithai-fixkit-android/tests/run-all.js
// Exit 0 = green (gate passes). Any failure exits non-zero (BLOCKING).
//
// Sections:
//   1. stub lifecycles      (android-stub-logic red->green; android-stub-assist handoff+candidate, closed refused)
//   2. capability           (UI = ASSIST, Logic = FULL, System = FULL)
//   3. negative tests       (core validateLedger + validateHandoff: ASSIST ceiling, handoff binding
//                            incl. target.env, logic binding + integrity) each paired with an ACCEPT control
//   4. mutation checks      (capability flip; lifecycle flip; handoff expected-drop; handoff target-drop)
//   5. convention + eval-schema linters
//   6. 4-key version sync   (plugin.json == mkt top == plugins[0] == root entry)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseFrontmatter } = require('./lib/frontmatter');

const ROOT = path.join(__dirname, '..');                 // plugin root
const REPO = path.join(ROOT, '..', '..');                // repo root
const SKILLS_DIR = path.join(ROOT, 'skills');
const CORE_LIB = path.join(REPO, 'plugins', 'shipwithai-fixkit-core', 'lib');
const LEDGER_VALIDATOR = path.join(CORE_LIB, 'ledger-validator.js');
const HANDOFF_VALIDATOR = path.join(CORE_LIB, 'handoff-validator.js');
const LOGIC_FIX = path.join(ROOT, 'evals', 'fixtures', 'android-stub-logic');
const ASSIST_FIX = path.join(ROOT, 'evals', 'fixtures', 'android-stub-assist');

let pass = 0;
const failures = [];
function ok(name) { pass++; console.log(`  ✓ ${name}`); }
function fail(name, detail) { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
function assert(cond, name, detail) { cond ? ok(name) : fail(name, detail); }
function section(t) { console.log(`\n${t}`); }
function hasCode(res, code) { return res.violations.some((x) => x.code === code); }
function runExpectFail(file) { try { execFileSync(process.execPath, [file], { stdio: 'pipe' }); return false; } catch (e) { return true; } }
function runExpectPass(file) { try { execFileSync(process.execPath, [file], { stdio: 'pipe' }); return true; } catch (e) { return false; } }

// 1. STUB LIFECYCLES --------------------------------------------------------
section('1. stub lifecycles (logic red->green; assist handoff+candidate, closed refused)');
assert(runExpectFail(path.join(LOGIC_FIX, 'reproduce.test.js')), 'logic: reproduce.test.js FAILS against buggy.js (wrong discount reproduced)');
assert(runExpectPass(path.join(LOGIC_FIX, 'verify.test.js')), 'logic: verify.test.js PASSES against fixed.js (failing test now passes)');
assert(runExpectPass(path.join(ASSIST_FIX, 'assist.test.js')), 'assist: handoff valid + candidate accepted + closed refused (ASSIST ceiling)');

// 2. CAPABILITY DECLARATION -------------------------------------------------
section('2. capability declaration (lib/capability.json)');
let cap = null;
try { cap = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'capability.json'), 'utf8')); }
catch (e) { fail('lib/capability.json valid JSON', e.message); }
if (cap) {
  assert(cap.UI === 'ASSIST' && cap.Logic === 'FULL' && cap.System === 'FULL',
    'capability.json declares UI = ASSIST, Logic = FULL, System = FULL', `UI=${cap.UI} Logic=${cap.Logic} System=${cap.System}`);
}

// 3. NEGATIVE TESTS (reuse core's real validators — single source of truth) -
section('3. negative tests (ASSIST ceiling, handoff binding incl. target.env, logic binding + integrity)');
const validatorsExist = fs.existsSync(LEDGER_VALIDATOR) && fs.existsSync(HANDOFF_VALIDATOR);
assert(validatorsExist, 'core ledger + handoff validators resolvable from the android gate', CORE_LIB);
if (validatorsExist) {
  const { validateLedger } = require(LEDGER_VALIDATOR);
  const { validateHandoff } = require(HANDOFF_VALIDATOR);

  // (a) zero false closed: a UI ASSIST ledger forced to closed (evidence+verifier+fix filled, so the
  // ONLY blocking code is the ceiling) is refused; the same ledger at candidate is accepted; and a
  // filled ledger at `verified` ACCEPTS (a filled handoff advances per core's rules — yet closed
  // stays barred). Encodes the headline: no recorded verified_by -> no closed; ASSIST never closes.
  const assistClosed = { state: 'closed', symptom_layer: 'UI', root_cause: 'rc', fix: 'f',
    verification: { method: 'computed-style', capability_tier: 'ASSIST', evidence: 'provider report', verified_by: 'cowork' } };
  const a1 = validateLedger(assistClosed);
  assert(!a1.ok && hasCode(a1, 'ASSIST_CANNOT_CLOSE'), '(a) ASSIST UI@closed is REFUSED (ASSIST_CANNOT_CLOSE)', JSON.stringify(a1.violations));
  const assistCandidate = { state: 'candidate', symptom_layer: 'UI', root_cause: 'rc',
    verification: { method: 'computed-style', capability_tier: 'ASSIST' } };
  const a2 = validateLedger(assistCandidate);
  assert(a2.ok, '(a) control: ASSIST UI@candidate is ACCEPTED', JSON.stringify(a2.violations));
  const assistVerified = { state: 'verified', symptom_layer: 'UI', root_cause: 'rc', fix: 'f',
    verification: { method: 'computed-style', capability_tier: 'ASSIST', evidence: 'provider observed on Pixel 8', verified_by: 'cowork' } };
  const a3 = validateLedger(assistVerified);
  assert(a3.ok, '(a) control: a FILLED ASSIST UI ledger@verified ADVANCES (closed still barred)', JSON.stringify(a3.violations));

  // (b) handoff binding: a UI handoff promising a Logic proof is refused; missing verified_by slot is
  // refused; missing target.env is refused; controls: a complete unfilled handoff (computed-style) and
  // a complete unfilled handoff using interaction-assertion are both accepted (Decision A: reuse).
  const baseHandoff = () => ({ version: 'handoff/v0', bug_id: 'BUG-1', symptom_layer: 'UI',
    target: { env: 'device' }, steps: ['observe'], assertion: { method: 'computed-style', expected: 'no clipping' }, verified_by: null });
  const bMismatch = baseHandoff(); bMismatch.assertion.method = 'test-run';
  const b1 = validateHandoff(bMismatch);
  assert(!b1.ok && hasCode(b1, 'HANDOFF_LAYER_MISMATCH'), '(b) UI handoff asserting test-run is REFUSED (HANDOFF_LAYER_MISMATCH)', JSON.stringify(b1.violations));
  const bNoSlot = baseHandoff(); delete bNoSlot.verified_by;
  const b2 = validateHandoff(bNoSlot);
  assert(!b2.ok && hasCode(b2, 'HANDOFF_NO_VERIFIED_BY_SLOT'), '(b) handoff missing verified_by slot is REFUSED (HANDOFF_NO_VERIFIED_BY_SLOT)', JSON.stringify(b2.violations));
  const bNoEnv = baseHandoff(); delete bNoEnv.target.env;
  const b3 = validateHandoff(bNoEnv);
  assert(!b3.ok && hasCode(b3, 'HANDOFF_NO_TARGET_ENV'), '(b) handoff missing target.env is REFUSED (HANDOFF_NO_TARGET_ENV)', JSON.stringify(b3.violations));
  const b4 = validateHandoff(baseHandoff());
  assert(b4.ok, '(b) control: a complete unfilled handoff (verified_by: null) is ACCEPTED', JSON.stringify(b4.violations));
  const bInteract = baseHandoff(); bInteract.assertion.method = 'interaction-assertion'; bInteract.assertion.expected = 'tapping the row navigates to detail';
  const b5 = validateHandoff(bInteract);
  assert(b5.ok, '(b) control: a UI handoff using interaction-assertion is ACCEPTED (Decision A reuse)', JSON.stringify(b5.violations));

  // (c) logic binding + integrity (Logic = FULL): Logic verified by a non-test method is refused;
  // Logic closed without evidence is refused; the control with a test method + evidence is accepted.
  const c1 = validateLedger({ state: 'verified', symptom_layer: 'Logic', root_cause: 'rc', fix: 'f',
    verification: { method: 'computed-style', capability_tier: 'FULL', evidence: 'x', verified_by: 'agent' } });
  assert(!c1.ok && hasCode(c1, 'VERIFICATION_LAYER_MISMATCH'), '(c) Logic@verified by a UI method is REFUSED (VERIFICATION_LAYER_MISMATCH)', JSON.stringify(c1.violations));
  const c2 = validateLedger({ state: 'closed', symptom_layer: 'Logic', root_cause: 'rc', fix: 'f',
    verification: { method: 'failing-test-passes', capability_tier: 'FULL', evidence: '', verified_by: 'agent' } });
  assert(!c2.ok && hasCode(c2, 'INTEGRITY_EVIDENCE_EMPTY'), '(c) Logic@closed without evidence is REFUSED (INTEGRITY_EVIDENCE_EMPTY)', JSON.stringify(c2.violations));
  const c3 = validateLedger({ state: 'closed', symptom_layer: 'Logic', root_cause: 'rc', fix: 'f',
    verification: { method: 'failing-test-passes', capability_tier: 'FULL', evidence: 'suite green; failing test now passes', verified_by: 'agent' } });
  assert(c3.ok, '(c) control: Logic@closed with failing-test-passes + evidence is ACCEPTED', JSON.stringify(c3.violations));
}

// 4. MUTATION CHECKS (prove the gate bites) ---------------------------------
section('4. mutation checks (capability flip; lifecycle flip; handoff expected-drop; handoff target-drop)');
// M1 capability flip: flipping UI to FULL must break the section-2 predicate.
if (cap) {
  const mutated = Object.assign({}, cap, { UI: 'FULL' });
  const predicate = (c) => c.UI === 'ASSIST' && c.Logic === 'FULL' && c.System === 'FULL';
  assert(predicate(cap) && !predicate(mutated), 'M1 capability flip: UI=FULL breaks the capability check (gate bites)');
}
// M2 lifecycle flip: a reproduce test pointed at fixed.js must STOP failing (the failure was
// buggy-specific, not a vacuous always-throw). Write a temp variant, run it, expect exit 0, clean up.
{
  const src = fs.readFileSync(path.join(LOGIC_FIX, 'reproduce.test.js'), 'utf8').replace("require('./buggy')", "require('./fixed')");
  const tmp = path.join(LOGIC_FIX, '._mut_reproduce_on_fixed.js');
  let flipped = false;
  try { fs.writeFileSync(tmp, src); flipped = runExpectPass(tmp); } finally { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); }
  assert(flipped, 'M2 lifecycle flip: reproduce against fixed.js PASSES (the reproduction is buggy-specific)');
}
// M3 + M4 handoff-path mutations: dropping assertion.expected and dropping target.env must each flip
// validateHandoff to not-ok with the matching code.
if (validatorsExist) {
  const { validateHandoff } = require(HANDOFF_VALIDATOR);
  const h3 = JSON.parse(fs.readFileSync(path.join(ASSIST_FIX, 'handoff.json'), 'utf8'));
  const before3 = validateHandoff(h3).ok;
  delete h3.assertion.expected;
  const after3 = validateHandoff(h3);
  assert(before3 && !after3.ok && hasCode(after3, 'HANDOFF_NO_EXPECTED'), 'M3 handoff drop: removing assertion.expected fails validateHandoff (HANDOFF_NO_EXPECTED)', JSON.stringify(after3.violations));
  const h4 = JSON.parse(fs.readFileSync(path.join(ASSIST_FIX, 'handoff.json'), 'utf8'));
  const before4 = validateHandoff(h4).ok;
  delete h4.target.env;
  const after4 = validateHandoff(h4);
  assert(before4 && !after4.ok && hasCode(after4, 'HANDOFF_NO_TARGET_ENV'), 'M4 handoff drop: removing target.env fails validateHandoff (HANDOFF_NO_TARGET_ENV)', JSON.stringify(after4.violations));
}

// 5. CONVENTION + EVAL-SCHEMA LINTERS (BLOCKING) ----------------------------
section('5. Convention + eval-schema linters');
function walkSkillFiles() {
  const out = [];
  if (!fs.existsSync(SKILLS_DIR)) return out;
  for (const s of fs.readdirSync(SKILLS_DIR)) {
    const skillMd = path.join(SKILLS_DIR, s, 'SKILL.md');
    if (fs.existsSync(skillMd)) out.push({ skill: s, file: skillMd });
  }
  return out;
}
function lastH2(text) { const m = text.match(/^##[^#].*$/gm); return m ? m[m.length - 1] : null; }
function maxFencedBlock(text) {
  const lines = text.split(/\r?\n/);
  let inBlock = false, len = 0, max = 0;
  for (const ln of lines) {
    if (/^\s*```/.test(ln)) { if (inBlock) { max = Math.max(max, len); inBlock = false; len = 0; } else { inBlock = true; len = 0; } }
    else if (inBlock) { len++; }
  }
  return max;
}
const skills = walkSkillFiles();
assert(skills.length >= 4, 'at least 4 skills present', String(skills.length));
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
assert(subSkillCount >= 1, 'at least 1 skill is a user-invocable:false sub-skill', String(subSkillCount));
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

// 6. 4-KEY VERSION SYNC -----------------------------------------------------
section('6. 4-key version sync (this plugin)');
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
  console.log(`PASS — ${pass} checks green. Android-adapter gate satisfied.`);
  process.exit(0);
} else {
  console.log(`FAIL — ${failures.length} failing, ${pass} passing:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
