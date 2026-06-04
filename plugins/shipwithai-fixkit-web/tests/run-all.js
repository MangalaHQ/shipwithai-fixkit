'use strict';
// shipwithai-fixkit-web — the deterministic blocking gate for the web adapter.
// Run from the repo root:  node plugins/shipwithai-fixkit-web/tests/run-all.js
// Exit 0 = green (gate passes). Any failure exits non-zero (BLOCKING).
//
// Sections:
//   1. web-stub lifecycle      (reproduce FAILS against buggy, verify PASSES against fixed)
//   2. capability declaration  (UI/Logic/System = FULL)
//   3. convention linters      (>=4 skills; <200 lines; "What this ... does NOT do"; fenced <=20;
//                               description <200; >=1 user-invocable:false; evals >=5 with 3/2 split)
//   4. 4-key version sync      (plugin.json == per-plugin mkt top == plugins[0] == root mkt entry)

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseFrontmatter } = require('./lib/frontmatter');

const ROOT = path.join(__dirname, '..');                 // plugin root
const REPO = path.join(ROOT, '..', '..');                // repo root
const SKILLS_DIR = path.join(ROOT, 'skills');

let pass = 0;
const failures = [];
function ok(name) { pass++; console.log(`  ✓ ${name}`); }
function fail(name, detail) { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
function assert(cond, name, detail) { cond ? ok(name) : fail(name, detail); }
function section(t) { console.log(`\n${t}`); }

// 1. WEB-STUB LIFECYCLE -----------------------------------------------------
section('1. web-stub lifecycle (computed-geometry reproduce -> verify)');
{
  const stub = path.join(ROOT, 'evals', 'fixtures', 'web-stub');
  // Reproduce: the expected behaviour FAILS against the buggy module (exit non-zero).
  let reproduced = false;
  try { execFileSync(process.execPath, [path.join(stub, 'reproduce.test.js')], { stdio: 'pipe' }); }
  catch (e) { reproduced = true; }
  assert(reproduced, 'reproduce.test.js FAILS against buggy.js (overflow reproduced: scrollWidth > clientWidth)');
  // Verify: the expected behaviour PASSES against the fixed module (exit zero).
  let verified = false;
  try { execFileSync(process.execPath, [path.join(stub, 'verify.test.js')], { stdio: 'pipe' }); verified = true; }
  catch (e) { verified = false; }
  assert(verified, 'verify.test.js PASSES against fixed.js (scrollWidth <= clientWidth, fix verified)');
}

// 2. CAPABILITY DECLARATION -------------------------------------------------
section('2. capability declaration (lib/capability.json)');
{
  let cap = null;
  try { cap = JSON.parse(fs.readFileSync(path.join(ROOT, 'lib', 'capability.json'), 'utf8')); }
  catch (e) { fail('lib/capability.json valid JSON', e.message); }
  if (cap) {
    assert(cap.UI === 'FULL' && cap.Logic === 'FULL' && cap.System === 'FULL',
      'capability.json declares UI/Logic/System = FULL', `UI=${cap.UI} Logic=${cap.Logic} System=${cap.System}`);
  }
}

// 3. CONVENTION + EVAL-SCHEMA LINTERS (BLOCKING) ----------------------------
section('3. Convention + eval-schema linters');
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

// eval schema: >=5 objects, >=3 trigger / >=2 must-not, required fields
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

// 4. 4-KEY VERSION SYNC -----------------------------------------------------
section('4. 4-key version sync (this plugin)');
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
  console.log(`PASS — ${pass} checks green. Web-adapter gate satisfied.`);
  process.exit(0);
} else {
  console.log(`FAIL — ${failures.length} failing, ${pass} passing:`);
  for (const f of failures) console.log(`  - ${f}`);
  process.exit(1);
}
