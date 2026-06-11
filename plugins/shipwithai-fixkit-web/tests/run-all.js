'use strict';
// shipwithai-fixkit-web — the deterministic blocking gate for the web adapter.
// Run from the repo root:  node plugins/shipwithai-fixkit-web/tests/run-all.js
// Exit 0 = green (gate passes). Any deterministic failure exits non-zero (BLOCKING).
//
// Since 0.3.0 this gate also carries the former harness plugin's gate (the standalone
// browser-runner plugin was folded into this adapter — zero checks dropped).
//
// Sections:
//   1. web-stub lifecycle      (reproduce FAILS against buggy, verify PASSES against fixed)
//   2. capability declaration  (UI/Logic/System = FULL)
//   3. measures.js unit test   (method strings pinned against core LAYER_METHODS.UI)
//   4. cross-plugin contract   (a harness-shaped ledger PASSES core validateLedger; a
//                               drifted-method twin is REJECTED with VERIFICATION_LAYER_MISMATCH)
//   5. playwright cwd-resolution (drive.js resolves `playwright` from the TARGET project's cwd,
//                               cwd tried FIRST; clear install message when absent — zero-dep,
//                               proven with a throwing stub package in a temp cwd)
//   6. convention linters      (>=4 skills; <200 lines; "What this ... does NOT do"; fenced <=20;
//                               description <200; >=1 user-invocable:false; evals >=5 with 3/2 split)
//   7. 4-key version sync      (plugin.json == per-plugin mkt top == plugins[0] == root mkt entry)
//   8. Tier B — CONDITIONAL Playwright smoke. Runs only if `playwright` resolves (plain
//      require.resolve — deliberately NOT cwd-aware, so the deterministic SKIP is stable);
//      otherwise SKIPs. The gate's green NEVER depends on Tier B.

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { parseFrontmatter } = require('./lib/frontmatter');

const ROOT = path.join(__dirname, '..');                 // plugin root
const REPO = path.join(ROOT, '..', '..');                // repo root
const SKILLS_DIR = path.join(ROOT, 'skills');
const measures = require(path.join(ROOT, 'lib', 'measures'));
// Sibling require of the core trust anchor — zero-dependency, by directory convention.
const { validateLedger, LAYER_METHODS } = require(
  path.join(REPO, 'plugins', 'shipwithai-fixkit-core', 'lib', 'ledger-validator'));

let pass = 0;
const failures = [];
function ok(name) { pass++; console.log(`  ✓ ${name}`); }
function fail(name, detail) { failures.push(`${name}${detail ? ' — ' + detail : ''}`); console.log(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); }
function assert(cond, name, detail) { cond ? ok(name) : fail(name, detail); }
function section(t) { console.log(`\n${t}`); }
function deepEq(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

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

// 3. MEASURES PURE-HELPER UNIT TEST (zero-dep) -------------------------------
section('3. measures.js pure helpers (method pinned to core LAYER_METHODS.UI)');
{
  const UI = LAYER_METHODS.UI;
  // overflow: bug present -> ok:false; healthy -> ok:true
  const oBug = measures.overflow({ scrollWidth: 612, clientWidth: 280 });
  const oFix = measures.overflow({ scrollWidth: 280, clientWidth: 280 });
  assert(UI.includes(oBug.method), 'overflow.method is a UI LAYER_METHOD', oBug.method);
  assert(oBug.ok === false && oFix.ok === true, 'overflow polarity (612>280 ->false; 280==280 ->true)');
  assert(oBug.evidence.scrollWidth === 612 && oBug.evidence.overflow === true, 'overflow evidence carries observed numbers');

  // computed-style: expected match drives ok
  const cBug = measures.computedStyle({ prop: 'white-space', value: 'pre', expected: 'pre-wrap' });
  const cFix = measures.computedStyle({ prop: 'white-space', value: 'pre-wrap', expected: 'pre-wrap' });
  assert(UI.includes(cBug.method), 'computedStyle.method is a UI LAYER_METHOD', cBug.method);
  assert(cBug.ok === false && cFix.ok === true, 'computedStyle polarity (value vs expected)');

  // console: any message -> ok:false; none -> ok:true
  const kBug = measures.consoleErrors({ messages: ['hydration error: storage not allowed'] });
  const kFix = measures.consoleErrors({ messages: [] });
  assert(UI.includes(kBug.method), 'consoleErrors.method is a UI LAYER_METHOD', kBug.method);
  assert(kBug.ok === false && kFix.ok === true, 'console polarity (1 msg ->false; 0 ->true)');
  assert(kBug.evidence.count === 1, 'console evidence counts messages');

  // interaction: with expected, ok iff after === expected
  const iBug = measures.interaction({ before: 'idle', after: 'idle', expected: 'saved' });
  const iFix = measures.interaction({ before: 'idle', after: 'saved', expected: 'saved' });
  assert(UI.includes(iBug.method), 'interaction.method is a UI LAYER_METHOD', iBug.method);
  assert(iBug.ok === false && iFix.ok === true, 'interaction polarity (dead control ->false; wired ->true)');

  // viewport: any failing width -> ok:false; none -> ok:true
  const vBug = measures.viewport({ perWidth: { 1280: { scrollWidth: 280, clientWidth: 280 }, 375: { scrollWidth: 612, clientWidth: 375 } } });
  const vFix = measures.viewport({ perWidth: { 1280: { scrollWidth: 280, clientWidth: 280 }, 375: { scrollWidth: 375, clientWidth: 375 } } });
  assert(UI.includes(vBug.method), 'viewport.method is a UI LAYER_METHOD', vBug.method);
  assert(vBug.ok === false && vFix.ok === true, 'viewport polarity (one width overflows ->false)');
  assert(deepEq(vBug.evidence.failingWidths, ['375']), 'viewport evidence names the failing widths', JSON.stringify(vBug.evidence.failingWidths));

  // scroll-read-state: scroll-then-read STATE — REUSES interaction-assertion (NO new METHOD key).
  // With expected, ok iff after === expected (bug: state didn't reach expected after scroll).
  const sBug = measures.scrollReadState({ ratio: 0.25, before: 'true', after: 'true', expected: 'false' });
  const sFix = measures.scrollReadState({ ratio: 0.25, before: 'true', after: 'false', expected: 'false' });
  assert(UI.includes(sBug.method), 'scrollReadState.method is a UI LAYER_METHOD', sBug.method);
  assert(sBug.method === measures.METHOD.interaction, 'scrollReadState reuses interaction-assertion (no new method)', sBug.method);
  assert(sBug.ok === false && sFix.ok === true, 'scrollReadState polarity (state not reached ->false; reached ->true)');
  assert(sBug.evidence.ratio === 0.25 && sBug.evidence.before === 'true' && sBug.evidence.after === 'true', 'scrollReadState evidence carries ratio/before/after');
  assert(sBug.evidence.expected === 'false', 'scrollReadState evidence carries expected', JSON.stringify(sBug.evidence));
  // Without expected, ok iff state CHANGED after the scroll.
  const sChanged = measures.scrollReadState({ ratio: 0.5, before: 'true', after: 'false' });
  const sStuck = measures.scrollReadState({ ratio: 0.5, before: 'true', after: 'true' });
  assert(sChanged.ok === true && sStuck.ok === false, 'scrollReadState no-expected polarity (changed ->true; unchanged ->false)');
  assert(sChanged.evidence.expected === null, 'scrollReadState evidence.expected is null when absent', JSON.stringify(sChanged.evidence));

  // EVERY helper's method must be a member of UI LAYER_METHODS, and the 5 must be distinct.
  const emitted = Object.values(measures.METHOD);
  assert(emitted.every((m) => UI.includes(m)), 'every measures.METHOD value is in core LAYER_METHODS.UI', emitted.join(','));
  assert(new Set(emitted).size === 5, 'the 5 helpers map to 5 distinct UI methods', String(new Set(emitted).size));
}

// 4. CROSS-PLUGIN CONTRACT TEST (zero-dep) ----------------------------------
section('4. cross-plugin contract (harness-shaped ledger vs core validateLedger)');
{
  const cdir = path.join(ROOT, 'evals', 'fixtures', 'contract');
  const valid = parseFrontmatter(fs.readFileSync(path.join(cdir, 'harness-ui-close.valid.md'), 'utf8'));
  const drift = parseFrontmatter(fs.readFileSync(path.join(cdir, 'harness-ui-close.drift-method.md'), 'utf8'));
  const rv = validateLedger(valid);
  assert(rv.ok, 'valid harness-shaped UI/FULL ledger is ACCEPTED by core', JSON.stringify(rv.violations));
  const rd = validateLedger(drift);
  const mism = rd.violations.some((x) => x.code === 'VERIFICATION_LAYER_MISMATCH');
  assert(!rd.ok && mism, 'drifted-method twin is REJECTED with VERIFICATION_LAYER_MISMATCH', JSON.stringify(rd.violations));
}

// 5. PLAYWRIGHT CWD-RESOLUTION — the (b) fix, tests-first (zero-dep) --------
section('5. playwright cwd-resolution (drive.js resolves from the target project cwd)');
{
  const os = require('os');
  const drivePath = path.join(ROOT, 'lib', 'drive.js');
  const driveSrc = fs.readFileSync(drivePath, 'utf8');

  // (1) Behavioral stub bite: a `playwright` package living in the INVOKING CWD's node_modules
  // must be the one drive.js loads. The stub's chromium.launch() throws a marker; if the runner
  // resolved playwright any other way (plugin dir, global), the marker can never appear.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'fixkit-pw-stub-'));
  try {
    const stubDir = path.join(tmp, 'node_modules', 'playwright');
    fs.mkdirSync(stubDir, { recursive: true });
    fs.writeFileSync(path.join(stubDir, 'package.json'),
      JSON.stringify({ name: 'playwright', version: '0.0.0-fixkit-stub', main: 'index.js' }));
    fs.writeFileSync(path.join(stubDir, 'index.js'),
      "module.exports = { chromium: { launch() { throw new Error('FIXKIT_STUB_PLAYWRIGHT_LOADED'); } } };\n");
    let out = '';
    try {
      out = execFileSync(process.execPath, [drivePath, '--url', 'file:///fixkit-stub.html', '--measure', 'console'],
        { stdio: 'pipe', cwd: tmp }).toString();
    } catch (e) {
      out = (e.stdout ? e.stdout.toString() : '') + (e.stderr ? e.stderr.toString() : '');
    }
    assert(out.includes('FIXKIT_STUB_PLAYWRIGHT_LOADED'),
      'drive.js loads the TARGET CWD playwright (stub in temp-cwd node_modules is the one required)',
      out.trim().slice(0, 160));
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  // (2) Source + ORDERING: the cwd-paths resolve must exist AND come BEFORE any plain fallback —
  // if the order flips, a plugin-dir-resolvable playwright would shadow the target project's.
  const cwdIdx = driveSrc.indexOf("require.resolve('playwright', { paths: [process.cwd()] })");
  const plainIdx = driveSrc.indexOf("require.resolve('playwright');");
  assert(cwdIdx !== -1 && (plainIdx === -1 || cwdIdx < plainIdx),
    'drive.js resolves playwright cwd-FIRST ({ paths: [process.cwd()] } before any plain fallback)',
    `cwdIdx=${cwdIdx} plainIdx=${plainIdx}`);

  // (3) Error-message contract: the absent-playwright error names the target-project install step.
  assert(driveSrc.includes('npm install -D playwright'),
    "drive.js absent-playwright error names the install step (npm install -D playwright)");
}

// 6. CONVENTION + EVAL-SCHEMA LINTERS (BLOCKING) ----------------------------
section('6. Convention + eval-schema linters');
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

// 7. 4-KEY VERSION SYNC -----------------------------------------------------
section('7. 4-key version sync (this plugin)');
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

// 8. TIER B — CONDITIONAL PLAYWRIGHT SMOKE (never blocks the gate) ----------
section('8. Tier B — Playwright smoke (conditional)');
{
  // Run-or-skip probe: PLAIN require.resolve, deliberately NOT cwd-aware — the gate's
  // deterministic SKIP must not flip to a RUN because the invoking cwd happens to carry a
  // `playwright` package without a chromium binary. Only drive.js's own resolution is cwd-aware.
  let hasPlaywright = true;
  try { require.resolve('playwright'); } catch (e) { hasPlaywright = false; }
  if (!hasPlaywright) {
    console.log('  ⚠ SKIP — playwright not installed (npx playwright install chromium). Deterministic green stands.');
  } else {
    const drive = path.join(ROOT, 'lib', 'drive.js');
    const fx = (f) => 'file://' + path.join(ROOT, 'evals', 'fixtures', 'smoke-page', f);
    const run = (args) => JSON.parse(execFileSync(process.execPath, [drive, ...args], { stdio: 'pipe' }).toString().trim());
    const tryRun = (args) => { try { return { code: 0, out: run(args) }; } catch (e) { return { code: e.status || 1, out: e.stdout ? JSON.parse(e.stdout.toString().trim()) : null }; } };
    const UI = LAYER_METHODS.UI;
    // 5 measures x 2 polarities on the broken/fixed fixtures.
    const cases = [
      ['overflow broken',  ['--url', fx('broken.html'), '--measure', 'overflow', '--selector', '#code'], false],
      ['overflow fixed',   ['--url', fx('fixed.html'),  '--measure', 'overflow', '--selector', '#code'], true],
      ['computed broken',  ['--url', fx('broken.html'), '--measure', 'computed-style', '--selector', '#code', '--prop', 'whiteSpace', '--expected', 'pre-wrap'], false],
      ['computed fixed',   ['--url', fx('fixed.html'),  '--measure', 'computed-style', '--selector', '#code', '--prop', 'whiteSpace', '--expected', 'pre-wrap'], true],
      ['console broken',   ['--url', fx('broken.html'), '--measure', 'console'], false],
      ['console fixed',    ['--url', fx('fixed.html'),  '--measure', 'console'], true],
      ['interaction broken',['--url', fx('broken.html'),'--measure', 'interaction', '--selector', '#save', '--target', '#status', '--expected', 'saved'], false],
      ['interaction fixed', ['--url', fx('fixed.html'), '--measure', 'interaction', '--selector', '#save', '--target', '#status', '--expected', 'saved'], true],
      ['viewport broken',  ['--url', fx('broken.html'), '--measure', 'viewport', '--selector', '#code', '--widths', '1280,768,375'], false],
      ['viewport fixed',   ['--url', fx('fixed.html'),  '--measure', 'viewport', '--selector', '#code', '--widths', '1280,768,375'], true],
      // scroll-read-state: reuses interaction-assertion; no --expected -> ok iff disabled flipped after the scroll.
      ['scroll-read-state broken', ['--url', fx('broken.html'), '--measure', 'scroll-read-state', '--target', '#react', '--prop', 'disabled', '--ratio', '0.5'], false],
      ['scroll-read-state fixed',  ['--url', fx('fixed.html'),  '--measure', 'scroll-read-state', '--target', '#react', '--prop', 'disabled', '--ratio', '0.5'], true],
    ];
    for (const [label, args, expectedOk] of cases) {
      const r = tryRun(args);
      const good = r.out && UI.includes(r.out.method) && r.out.ok === expectedOk && r.out.evidence;
      assert(good, `smoke: ${label} -> method in UI methods, ok=${expectedOk}, has evidence`, JSON.stringify(r.out));
    }
    // failure shape: a bad selector exits non-zero with {ok:false,error} and NO method.
    const f = tryRun(['--url', fx('fixed.html'), '--measure', 'overflow', '--selector', '#does-not-exist']);
    assert(f.code !== 0 && f.out && f.out.ok === false && !f.out.method, 'smoke: missing selector -> non-zero + {ok:false,error}, no method', JSON.stringify(f.out));
    // scroll-read-state shares the same failure discipline: missing --ratio -> non-zero, no method.
    const fs2 = tryRun(['--url', fx('fixed.html'), '--measure', 'scroll-read-state', '--target', '#react']);
    assert(fs2.code !== 0 && fs2.out && fs2.out.ok === false && !fs2.out.method, 'smoke: scroll-read-state missing --ratio -> non-zero + {ok:false,error}, no method', JSON.stringify(fs2.out));
  }
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
