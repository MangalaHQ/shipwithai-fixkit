'use strict';
// shipwithai-fixkit-web-harness — the 5 UI LAYER_METHODS shaping helpers.
//
// PURE & BROWSER-FREE: each helper turns a raw in-page observation (numbers/strings the
// Playwright runner `drive.js` already collected via page.evaluate) into the canonical
// `{ method, ok, evidence }` the engine records in the ledger. No Playwright import here —
// this file is unit-tested deterministically with no browser (tests/run-all.js Tier A).
//
//   method   — ALWAYS one of core's UI LAYER_METHODS (the validator closes UI only on these).
//   ok       — true when the HEALTHY/expected state holds (no bug). reproduce expects ok=false;
//              verify expects ok=true. A failed observation never reaches here (drive.js exits
//              non-zero with {ok:false,error} and NO method, so a failure is never mistaken for proof).
//   evidence — the OBSERVED numbers, so the close proof is non-circular (never a source diff).
//
// The method strings are intentionally NOT re-listed as the source of truth: tests/run-all.js
// pins every value below against LAYER_METHODS.UI imported from core, so they cannot drift.

const METHOD = {
  overflow: 'dom-assertion',          // scrollWidth vs clientWidth geometry
  computedStyle: 'computed-style',    // getComputedStyle read
  console: 'console-assertion',       // console error/warning capture
  interaction: 'interaction-assertion', // post-interaction DOM/state
  viewport: 'browser-assertion',      // viewport/resize matrix
};

// layout / overflow — o: { scrollWidth, clientWidth }
function overflow(o) {
  const overflowing = Number(o.scrollWidth) > Number(o.clientWidth);
  return {
    method: METHOD.overflow,
    ok: !overflowing,
    evidence: { scrollWidth: o.scrollWidth, clientWidth: o.clientWidth, overflow: overflowing },
  };
}

// visual / styling — o: { prop, value, expected? }
function computedStyle(o) {
  const ok = o.expected === undefined ? null : o.value === o.expected;
  return {
    method: METHOD.computedStyle,
    ok,
    evidence: { prop: o.prop, value: o.value, expected: o.expected === undefined ? null : o.expected },
  };
}

// client-runtime — o: { messages: string[] }
function consoleErrors(o) {
  const messages = Array.isArray(o.messages) ? o.messages : [];
  return {
    method: METHOD.console,
    ok: messages.length === 0,
    evidence: { count: messages.length, messages },
  };
}

// interaction / behavior — o: { before, after, expected? }
function interaction(o) {
  const changed = o.before !== o.after;
  const ok = o.expected === undefined ? changed : o.after === o.expected;
  return {
    method: METHOD.interaction,
    ok,
    evidence: { before: o.before, after: o.after, expected: o.expected === undefined ? null : o.expected },
  };
}

// responsive — o: { perWidth: { <width>: { scrollWidth, clientWidth } } }
function viewport(o) {
  const perWidth = (o && o.perWidth) || {};
  const failingWidths = Object.keys(perWidth)
    .filter((w) => Number(perWidth[w].scrollWidth) > Number(perWidth[w].clientWidth));
  return {
    method: METHOD.viewport,
    ok: failingWidths.length === 0,
    evidence: { perWidth, failingWidths },
  };
}

// scroll-driven interaction — o: { ratio, before, after, expected? }
// Scroll-spy / scroll-revealed STATE: the user scrolls, a scroll/IntersectionObserver listener
// flips a target's state. Behaviorally a post-action state assertion (like `interaction`), so it
// emits METHOD.interaction (interaction-assertion) — NO new UI method, core stays frozen.
function scrollReadState(o) {
  const changed = o.before !== o.after;
  const ok = o.expected === undefined ? changed : o.after === o.expected;
  return {
    method: METHOD.interaction,
    ok,
    evidence: { ratio: o.ratio, before: o.before, after: o.after, expected: o.expected === undefined ? null : o.expected },
  };
}

const MEASURES = { overflow, computedStyle, consoleErrors, interaction, viewport, scrollReadState };

module.exports = { ...MEASURES, MEASURES, METHOD };
