'use strict';
// shipwithai-fixkit-core — pattern miner (read-only ledger history miner).
//
// Mines an append-only `.fixkit/` directory of bug ledgers and proposes recurring-bug patterns
// (the playbook-monitor idiom). It NEVER writes a ledger; its output is a separate proposal
// artifact (a ranked candidate report). Zero dependencies. Reuses lib/frontmatter.js.
//
// THE MATCHING KEY (structural, not a curated vocabulary — so the miner discovers the corpus's
// answer instead of hard-coding it):
//   Two ledgers cluster only if their normalized `root_cause` shares a STRUCTURALLY detected
//   scope token — a package reference (`@scope/package`) or a backtick-quoted identifier —
//   PLUS at least (K-1) additional shared salient tokens (normalized, stopword-stripped).
//   K defaults to 2 (one scope token + >=1 salient token), injectable.
//   A cluster becomes a candidate when it holds >= `threshold` distinct bug ids (default 2).
//
// An OPTIONAL curated-vocabulary BOOST (`boostVocabulary`) only re-ranks candidates; it NEVER
// creates or dissolves a cluster (membership stays structural). Its values belong in the org
// pack config profile, never in core — core runs with the boost absent.

const fs = require('fs');
const path = require('path');
const { parseFrontmatter } = require('./frontmatter');

// Minimal generic stopwords — English filler + ledger-generic connective words. This is NOT a
// domain vocabulary (no organism/hydration/selector/...); adding domain nouns here would smuggle
// the answer into core. Keep it generic.
const STOPWORDS = new Set([
  'the', 'a', 'an', 'and', 'or', 'but', 'not', 'no', 'of', 'to', 'in', 'on', 'at', 'by', 'for',
  'with', 'from', 'into', 'out', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'it', 'its',
  'this', 'that', 'these', 'those', 'as', 'so', 'than', 'then', 'too', 'very', 'can', 'cannot',
  'will', 'would', 'should', 'could', 'has', 'have', 'had', 'do', 'does', 'did', 'done', 'only',
  'both', 'all', 'any', 'each', 'which', 'who', 'whom', 'what', 'when', 'where', 'why', 'how',
  'they', 'them', 'their', 'there', 'here', 'one', 'two', 'three', 'first', 'second', 'never',
  'always', 'already', 'still', 'also', 'else', 'such', 'per', 'via', 'because', 'about', 'above',
  'below', 'over', 'under', 'between', 'inside', 'outside', 'against', 'while', 'until', 'after',
  'before', 'separate', 'come', 'comes', 'fall', 'falls', 'lack', 'lacked', 'lacks', 'make', 'makes',
]);

const PKG_RE = /@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._/-]*/gi; // @scope/package
const BACKTICK_RE = /`([^`]+)`/g; // backtick-quoted identifier

function norm(s) {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim();
}

// Extract { scope:Set, salient:Set } from a root_cause string. Scope spans (package refs +
// backtick identifiers) are removed before salient tokenization, so the two sets are disjoint.
function tokenize(rootCause) {
  const text = String(rootCause || '');
  const scope = new Set();
  let stripped = text;

  let m;
  PKG_RE.lastIndex = 0;
  while ((m = PKG_RE.exec(text)) !== null) scope.add(norm(m[0]));
  stripped = stripped.replace(PKG_RE, ' ');

  BACKTICK_RE.lastIndex = 0;
  while ((m = BACKTICK_RE.exec(text)) !== null) {
    const id = norm(m[1]);
    if (!id) continue;
    // Ignore a quoted span that is only filler/stopwords (e.g. `the and`) — not an identifier;
    // it must carry at least one meaningful (non-stopword, length>=2) word to count as a scope token.
    const meaningful = id.split(/[^a-z0-9]+/).some((w) => w.length >= 2 && !STOPWORDS.has(w));
    if (meaningful) scope.add(id);
  }
  stripped = stripped.replace(BACKTICK_RE, ' ');

  const salient = new Set();
  for (const raw of stripped.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3) continue;
    if (/^\d+$/.test(raw)) continue;
    if (STOPWORDS.has(raw)) continue;
    salient.add(raw);
  }
  return { scope, salient };
}

function intersect(a, b) {
  const out = new Set();
  for (const x of a) if (b.has(x)) out.add(x);
  return out;
}

// Read a ledger object from a markdown file. Fails LOUDLY on a malformed ledger (the PR #3
// lesson): a file with no frontmatter, or no `id`, throws — it is NEVER silently skipped.
function readLedgerFile(file) {
  const text = fs.readFileSync(file, 'utf8');
  const fm = parseFrontmatter(text);
  if (!fm || fm.id === undefined || fm.id === null || String(fm.id).trim() === '') {
    throw new Error(`malformed ledger (no parseable frontmatter id): ${file}`);
  }
  return fm;
}

// Load every top-level *.md ledger in a `.fixkit/` dir (handoffs/ and other subdirs are skipped).
function loadDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const ledgers = [];
  for (const e of entries) {
    if (!e.isFile() || !e.name.endsWith('.md')) continue;
    ledgers.push(readLedgerFile(path.join(dir, e.name)));
  }
  return ledgers;
}

// Core matcher over already-parsed ledger objects.
function mineLedgers(ledgers, options) {
  const opts = options || {};
  const threshold = Number.isInteger(opts.threshold) ? opts.threshold : 2;
  const K = Number.isInteger(opts.minSharedTokens) ? opts.minSharedTokens : 2;
  const boost = new Set((opts.boostVocabulary || []).map((t) => norm(t)));

  const nodes = ledgers
    .filter((l) => l && String(l.id || '').trim() !== '')
    .map((l) => ({ id: String(l.id).trim(), ledger: l, ...tokenize(l.root_cause) }));

  // Union-find over pairwise structural matches.
  const parent = nodes.map((_, i) => i);
  const find = (i) => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const union = (i, j) => { parent[find(i)] = find(j); };

  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const sharedScope = intersect(nodes[i].scope, nodes[j].scope);
      if (sharedScope.size < 1) continue; // a structural scope token is mandatory
      const sharedSalient = intersect(nodes[i].salient, nodes[j].salient);
      if (sharedSalient.size < (K - 1)) continue; // plus >=(K-1) additional salient tokens
      union(i, j);
    }
  }

  // Collect components.
  const groups = new Map();
  for (let i = 0; i < nodes.length; i++) {
    const r = find(i);
    if (!groups.has(r)) groups.set(r, []);
    groups.get(r).push(nodes[i]);
  }

  const candidates = [];
  for (const members of groups.values()) {
    // Frequency counts DISTINCT bug ids, not member files: an append-only `.fixkit/` can carry a
    // second file for a re-opened/superseded id, and a duplicated id must never inflate a pattern
    // (that would manufacture frequency the corpus does not have — the honesty clause).
    const bugIds = [...new Set(members.map((n) => n.id))].sort();
    if (bugIds.length < threshold) continue;
    // What binds ALL members (intersection across the whole cluster) — for the report.
    let scopeI = new Set(members[0].scope);
    let salientI = new Set(members[0].salient);
    for (let k = 1; k < members.length; k++) {
      scopeI = intersect(scopeI, members[k].scope);
      salientI = intersect(salientI, members[k].salient);
    }
    const sharedScope = [...scopeI].sort();
    const sharedSalient = [...salientI].sort();
    const facets = sharedFacets(members.map((n) => n.ledger));
    // Salience score = shared token count, with the optional boost adding weight (re-rank only).
    const boostHits = [...scopeI, ...salientI].filter((t) => boost.has(t)).length;
    const score = sharedScope.length * 2 + sharedSalient.length + boostHits * 3;
    candidates.push({
      bug_ids: bugIds,
      count: bugIds.length,
      shared_scope_tokens: sharedScope,
      shared_salient_tokens: sharedSalient,
      shared_facets: facets,
      score,
    });
  }

  candidates.sort((a, b) =>
    b.count - a.count || b.score - a.score || a.bug_ids[0].localeCompare(b.bug_ids[0]));
  return { threshold, minSharedTokens: K, total_ledgers: nodes.length, candidates };
}

// Facets common to every member (reported, not used for membership).
function sharedFacets(ledgers) {
  const facets = {};
  for (const key of ['symptom_layer', 'subtype', 'root_cause_layer', 'severity']) {
    const vals = new Set(ledgers.map((l) => String(l[key] || '').trim()).filter(Boolean));
    if (vals.size === 1) facets[key] = [...vals][0];
  }
  return facets;
}

function mineDir(dir, options) {
  return mineLedgers(loadDir(dir), options);
}

// ---- Rendering: a candidate report as a markdown proposal that CITES its source bug ids. ----
function renderMarkdown(report, srcDir) {
  const out = [];
  out.push(`# Pattern-mining report`);
  out.push('');
  out.push(`Source: \`${srcDir || '(ledger objects)'}\` · ledgers scanned: ${report.total_ledgers} · ` +
    `threshold: ${report.threshold} · min shared tokens (K): ${report.minSharedTokens}`);
  out.push('');
  if (report.candidates.length === 0) {
    out.push(`No recurring pattern at threshold ${report.threshold}. (Reported honestly — not forced.)`);
    return out.join('\n') + '\n';
  }
  out.push(`Found ${report.candidates.length} candidate pattern(s):`);
  out.push('');
  report.candidates.forEach((c, i) => {
    out.push(`## PATTERN-${String(i + 1).padStart(2, '0')} — ${c.count} bugs`);
    out.push('');
    out.push(`- **Source bug IDs (evidence):** ${c.bug_ids.join(', ')}`);
    out.push(`- **Shared scope token(s):** ${c.shared_scope_tokens.map((t) => '`' + t + '`').join(', ') || '(none)'}`);
    if (c.shared_salient_tokens.length) {
      out.push(`- **Shared salient tokens:** ${c.shared_salient_tokens.slice(0, 12).map((t) => '`' + t + '`').join(', ')}`);
    }
    const f = Object.entries(c.shared_facets).map(([k, v]) => `${k}=${v}`).join(', ');
    if (f) out.push(`- **Common facets:** ${f}`);
    out.push(`- **Proposed playbook action:** review the shared scope token across these bugs; ` +
      `if it is a recurring root-cause locus, add a playbook entry (human-reviewed) citing the IDs above.`);
    out.push('');
  });
  return out.join('\n') + '\n';
}

module.exports = { tokenize, mineLedgers, mineDir, loadDir, readLedgerFile, renderMarkdown };

// ---- CLI: node lib/pattern-miner.js <fixkit-dir> [--threshold N] [--json] -------------------
if (require.main === module) {
  const argv = process.argv.slice(2);
  const dir = argv.find((a) => !a.startsWith('--'));
  const asJson = argv.includes('--json');
  const tIdx = argv.indexOf('--threshold');
  const options = {};
  if (tIdx !== -1 && argv[tIdx + 1]) options.threshold = parseInt(argv[tIdx + 1], 10);
  if (!dir) {
    console.error('usage: node lib/pattern-miner.js <fixkit-dir> [--threshold N] [--json]');
    process.exit(2);
  }
  try {
    const report = mineDir(dir, options);
    if (asJson) process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    else process.stdout.write(renderMarkdown(report, dir));
    // Exit 0 always (a clean "no pattern" is not a failure); a malformed ledger threw above.
  } catch (e) {
    console.error(`pattern-miner: ${e.message}`);
    process.exit(1); // loud failure — never a silent skip
  }
}
