'use strict';
// Narrow, zero-dependency YAML-subset parser for the fixkit ledger frontmatter.
// Mirrored verbatim from the web adapter's tests/lib/frontmatter.js (compose by convention).
// It deliberately supports ONLY the fixed ledger schema shape:
//   - top-level `key: value` scalars (string / quoted-string / integer / bool / null)
//   - inline empty arrays  `key: []`
//   - exactly one level of nesting (the `verification:` object), 2-space indented
//   - empty values: `key:` and `key: ""` both parse to '' (so emptiness checks are stable)
// It is intentionally not a general YAML parser.

function parseScalar(s) {
  if (s === '') return '';
  if (s === '[]') return [];
  if (s === 'null' || s === '~') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    return s.slice(1, -1);
  }
  if (/^-?\d+$/.test(s)) return parseInt(s, 10);
  return s;
}

function indentOf(line) {
  return line.length - line.replace(/^\s+/, '').length;
}

// Parse the leading `---` frontmatter block of a markdown string into an object.
function parseFrontmatter(text) {
  const m = String(text).match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return {};
  const lines = m[1].split(/\r?\n/);
  const root = {};
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (indentOf(raw) > 0) continue; // nested lines are consumed by their parent below
    const line = raw.trim();
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const rest = line.slice(idx + 1).trim();
    if (rest === '') {
      const nested = {};
      let hasNested = false;
      for (let j = i + 1; j < lines.length; j++) {
        const nraw = lines[j];
        if (!nraw.trim()) continue;
        if (indentOf(nraw) === 0) break;
        const nline = nraw.trim();
        const nidx = nline.indexOf(':');
        if (nidx === -1) continue;
        nested[nline.slice(0, nidx).trim()] = parseScalar(nline.slice(nidx + 1).trim());
        hasNested = true;
      }
      root[key] = hasNested ? nested : '';
    } else {
      root[key] = parseScalar(rest);
    }
  }
  return root;
}

module.exports = { parseFrontmatter, parseScalar };
