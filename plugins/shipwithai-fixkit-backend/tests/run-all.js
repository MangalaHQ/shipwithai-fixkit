'use strict';
// shipwithai-fixkit-backend — the deterministic blocking gate for the backend adapter.
// Run from the repo root:  node plugins/shipwithai-fixkit-backend/tests/run-all.js
// Exit 0 = green (gate passes). Any failure exits non-zero (BLOCKING).
//
// Sections:
//   1. backend-stub-logic lifecycle        (reproduce FAILS on buggy, verify PASSES on fixed)
//   2. backend-stub-integration lifecycle  (boundary-log reproduce FAILS -> verify PASSES)
//   3. capability declaration              (Logic/System = FULL, UI = NONE)
//   4. negative tests via core validator   (Logic/System proof binding + evidence; UI refusal)
//   5. convention + eval-schema linters    (>=4 skills; <200; "does NOT do"; <=20; desc<200; subskill; evals)
//   6. 4-key version sync                   (plugin.json == mkt top == plugins[0] == root entry)
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseFrontmatter } = require('./lib/frontmatter');

const ROOT = path.join(__dirname, '..');                 // plugin root
const REPO = path.join(ROOT, '..', '..');                // repo root
const SKILLS_DIR = path.join(ROOT, 'skills');
const CORE_VALIDATOR = path.join(REPO, 'plugins', 'shipwithai-fixkit-core', 'lib', 'ledger-validator.js');

let pass = 0;
const failures = [];
function ok(name) { pass++; console.log(`  ✓ ${name}`); }
function fail(name, detail) { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
function assert(cond, name, detail) { cond ? ok(name) : fail(name, detail); }
function section(t) { console.log(`\n${t}`); }
function hasCode(res, code) { return res.violations.some((x) => x.code === code); }
function runLifecycle(dir, label) {
  let reproduced = false;
  try { execFileSync(process.execPath, [path.join(dir, 'reproduce.test.js')], { stdio: 'pipe' }); }
  catch (e) { reproduced = true; }
  assert(reproduced, `${label}: reproduce.test.js FAILS against buggy.js (bug reproduced)`);
  let verified = false;
  try { execFileSync(process.execPath, [path.join(dir, 'verify.test.js')], { stdio: 'pipe' }); verified = true; }
  catch (e) { verified = false; }
  assert(verified, `${label}: verify.test.js PASSES against fixed.js (fix verified)`);
}

// 1 + 2. STUB LIFECYCLES ----------------------------------------------------
section('1. backend-stub-logic lifecycle (failing test -> passes)');
runLifecycle(path.join(ROOT, 'evals', 'fixtures', 'backend-stub-logic'), 'logic');
section('2. backend-stub-integration lifecycle (boundary-log reproduce -> verify)');
runLifecycle(path.join(ROOT, 'evals', 'fixtures', 'backend-stub-integration'), 'integration');

// 3. CAPABILITY DECLARATION -------------------------------------------------
section('3. capability declaration (lib/capability.json)');
let cap = null;
try { cap = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'capability.json'), 'utf8')); }
catch (e) { fail('lib/capability.json valid JSON', e.message); }
if (cap) {
  assert(cap.Logic === 'FULL' && cap.System === 'FULL' && cap.UI === 'NONE',
    'capability.json declares Logic/System = FULL, UI = NONE', `UI=${cap.UI} Logic=${cap.Logic} System=${cap.System}`);
}

// 4. NEGATIVE TESTS (reuse core's real validator — single source of truth) ---
section('4. negative tests (Logic/System proof binding + UI refusal)');
assert(fs.existsSync(CORE_VALIDATOR), 'core ledger-validator.js resolvable from the backend gate', CORE_VALIDATOR);
if (fs.existsSync(CORE_VALIDATOR)) {
  const { validateLedger } = require(CORE_VALIDATOR);
  const ver = (m, ev) => ({ method: m, capability_tier: 'FULL', evidence: ev, verified_by: 'agent' });
  // (a) Logic cannot be verified by a non-Logic proof; cannot close without evidence.
  const a1 = validateLedger({ state: 'verified', symptom_layer: 'Logic', root_cause: 'rc', fix: 'f', verification: ver('instrumented-boundary', 'x') });
  assert(!a1.ok && hasCode(a1, 'VERIFICATION_LAYER_MISMATCH'), '(a) Logic@verified by a boundary method is REJECTED', JSON.stringify(a1.violations));
  const a2 = validateLedger({ state: 'closed', symptom_layer: 'Logic', root_cause: 'rc', fix: 'f', verification: ver('failing-test-passes', '') });
  assert(!a2.ok && hasCode(a2, 'INTEGRITY_EVIDENCE_EMPTY'), '(a) Logic@closed without recorded test evidence is REJECTED', JSON.stringify(a2.violations));
  const a3 = validateLedger({ state: 'closed', symptom_layer: 'Logic', root_cause: 'rc', fix: 'f', verification: ver('failing-test-passes', 'suite green; failing test now passes') });
  assert(a3.ok, '(a) control: Logic@closed with failing-test-passes + evidence is ACCEPTED', JSON.stringify(a3.violations));
  // (b) System cannot be verified by a Logic proof; cannot close without boundary evidence.
  const b1 = validateLedger({ state: 'verified', symptom_layer: 'System', root_cause: 'rc', fix: 'f', verification: ver('failing-test-passes', 'x') });
  assert(!b1.ok && hasCode(b1, 'VERIFICATION_LAYER_MISMATCH'), '(b) System@verified by a unit-test method is REJECTED', JSON.stringify(b1.violations));
  const b2 = validateLedger({ state: 'closed', symptom_layer: 'System', root_cause: 'rc', fix: 'f', verification: ver('instrumented-boundary', '') });
  assert(!b2.ok && hasCode(b2, 'INTEGRITY_EVIDENCE_EMPTY'), '(b) System@closed without boundary-log evidence is REJECTED', JSON.stringify(b2.violations));
  const b3 = validateLedger({ state: 'closed', symptom_layer: 'System', root_cause: 'rc', fix: 'f', verification: ver('instrumented-boundary', 'boundary: normalizedPath=/api/x status=200') });
  assert(b3.ok, '(b) control: System@closed with instrumented-boundary + evidence is ACCEPTED', JSON.stringify(b3.violations));
}
// (c) UI is refused by this adapter (capability NONE).
if (cap) {
  const accepts = (layer) => cap[layer] !== 'NONE';
  assert(cap.UI === 'NONE' && accepts('UI') === false, '(c) UI-symptom bug is REFUSED by this adapter (capability NONE)');
  assert(accepts('Logic') === true && accepts('System') === true, '(c) control: Logic + System are accepted (FULL)');
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
  console.log(`PASS — ${pass} checks green. Backend-adapter gate satisfied.`);
  process.exit(0);
} else {
  console.log(`FAIL — ${failures.length} failing, ${pass} passing:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
