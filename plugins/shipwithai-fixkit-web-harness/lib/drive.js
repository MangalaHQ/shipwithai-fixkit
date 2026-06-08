#!/usr/bin/env node
'use strict';
// shipwithai-fixkit-web-harness — the ~~browser binding (headless Playwright runner).
//
// This is the MECHANISM the engine drives in-loop to REPRODUCE and VERIFY a UI bug itself.
// It navigates a live target, takes ONE in-page observation, shapes it through lib/measures.js,
// and prints a single JSON line { method, ok, evidence } to stdout — `method` is always a UI
// LAYER_METHODS value, `evidence` is the observed numbers (non-circular proof). The layer-agent
// writes those into the ledger's verification.{method,evidence}; the core validator already
// refuses a close without them. The runner NEVER classifies the bug, picks the proof, or edits
// source — triage/verification/the layer-agents (all in core) do that.
//
// CLI:  node drive.js --url <url> --measure <type> [--selector <sel>] [options]
//   --measure overflow      --selector <sel>                       -> dom-assertion
//   --measure computed-style --selector <sel> --prop <p> [--expected <v>] -> computed-style
//   --measure console        [--wait <ms>]                         -> console-assertion
//   --measure interaction    --selector <sel> --target <sel> [--prop <p>] [--expected <v>] -> interaction-assertion
//   --measure scroll-read-state --target <sel> --ratio <0..1> [--scroller <sel>] [--prop <p>] [--expected <v>] [--wait <ms>] -> interaction-assertion
//   --measure viewport       --selector <sel> [--widths 1280,768,375] -> browser-assertion
//
// SUCCESS  -> exit 0, stdout = { method, ok, evidence }
// FAILURE  -> exit 1, stdout = { ok:false, error:<reason> }  (NO method: a failure is never proof)
//
// Playwright is a DOCUMENTED PREREQUISITE, not a vendored/declared dependency (see CLAUDE.md).
// It is required lazily so the rest of the harness (and its Tier-A gate) stays zero-dependency.

const measures = require('./measures');

// Safe, state-bearing element properties an `interaction` read may target (allowlist — see below).
const INTERACTION_PROPS = ['textContent', 'innerText', 'value', 'checked', 'disabled', 'className', 'id', 'ariaLabel'];

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      const key = argv[i].slice(2);
      const next = argv[i + 1];
      if (next === undefined || next.startsWith('--')) { a[key] = true; }
      else { a[key] = next; i++; }
    }
  }
  return a;
}

function emit(obj) { process.stdout.write(JSON.stringify(obj) + '\n'); }
function fail(reason) { emit({ ok: false, error: String(reason) }); process.exit(1); }

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.url) return fail('missing --url');
  if (!args.measure) return fail('missing --measure');
  const timeout = Number(args.timeout || 15000);

  let playwright;
  try { playwright = require('playwright'); }
  catch (e) { return fail('playwright not installed (run: npx playwright install chromium)'); }

  let browser;
  try {
    browser = await playwright.chromium.launch({ headless: true });
    const page = await browser.newPage();
    const consoleMsgs = [];
    page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') consoleMsgs.push(m.text()); });
    page.on('pageerror', (e) => consoleMsgs.push(String(e.message || e)));
    await page.goto(args.url, { waitUntil: 'networkidle', timeout });

    let result;
    if (args.measure === 'overflow') {
      if (!args.selector) return fail('overflow needs --selector');
      const geo = await page.$eval(args.selector, (el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
      result = measures.overflow(geo);
    } else if (args.measure === 'computed-style') {
      if (!args.selector || !args.prop) return fail('computed-style needs --selector and --prop');
      const value = await page.$eval(args.selector, (el, p) => getComputedStyle(el)[p], args.prop);
      result = measures.computedStyle({ prop: args.prop, value, expected: args.expected });
    } else if (args.measure === 'console') {
      await page.waitForTimeout(Number(args.wait || 500));
      result = measures.consoleErrors({ messages: consoleMsgs });
    } else if (args.measure === 'interaction') {
      if (!args.selector || !args.target) return fail('interaction needs --selector and --target');
      const prop = args.prop || 'textContent';
      // Defense-in-depth: --prop is supplied by the (LLM-driven) layer-agent, so bound the
      // post-interaction read to a safe allowlist of state-bearing properties — never arbitrary
      // element internals (e.g. innerHTML / ownerDocument). The observation is the rendered STATE.
      if (!INTERACTION_PROPS.includes(prop)) return fail(`interaction --prop '${prop}' not allowed (use one of: ${INTERACTION_PROPS.join(', ')})`);
      const before = await page.$eval(args.target, (el, p) => el[p], prop);
      await page.click(args.selector, { timeout });
      await page.waitForTimeout(Number(args.wait || 200));
      const after = await page.$eval(args.target, (el, p) => el[p], prop);
      result = measures.interaction({ before, after, expected: args.expected });
    } else if (args.measure === 'scroll-read-state') {
      if (!args.target || args.ratio === undefined || args.ratio === true) return fail('scroll-read-state needs --target and --ratio');
      const ratio = Number(args.ratio);
      if (Number.isNaN(ratio)) return fail(`scroll-read-state --ratio '${args.ratio}' is not a number`);
      const prop = args.prop || 'textContent';
      // Same allowlist as `interaction` — the post-scroll read is a rendered STATE, never internals.
      if (!INTERACTION_PROPS.includes(prop)) return fail(`scroll-read-state --prop '${prop}' not allowed (use one of: ${INTERACTION_PROPS.join(', ')})`);
      const before = await page.$eval(args.target, (el, p) => el[p], prop);
      // Scroll the named container (or the document scrolling element) to ratio of its scrollable height.
      await page.evaluate(({ sel, r }) => {
        const el = sel ? document.querySelector(sel) : (document.scrollingElement || document.documentElement);
        if (!el) throw new Error(`scroller not found: ${sel}`);
        const top = r * Math.max(0, el.scrollHeight - el.clientHeight);
        if (sel) { el.scrollTop = top; } else { window.scrollTo(0, top); }
      }, { sel: args.scroller || null, r: ratio });
      await page.waitForTimeout(Number(args.wait || 400)); // let IntersectionObserver / scroll listeners settle
      const after = await page.$eval(args.target, (el, p) => el[p], prop);
      result = measures.scrollReadState({ ratio, before, after, expected: args.expected });
    } else if (args.measure === 'viewport') {
      if (!args.selector) return fail('viewport needs --selector');
      const widths = String(args.widths || '1280,768,375').split(',').map((w) => parseInt(w, 10)).filter(Boolean);
      const perWidth = {};
      for (const w of widths) {
        await page.setViewportSize({ width: w, height: 800 });
        await page.waitForTimeout(Number(args.wait || 150));
        perWidth[w] = await page.$eval(args.selector, (el) => ({ scrollWidth: el.scrollWidth, clientWidth: el.clientWidth }));
      }
      result = measures.viewport({ perWidth });
    } else {
      return fail(`unknown --measure '${args.measure}'`);
    }

    emit(result);
    await browser.close();
    process.exit(0);
  } catch (e) {
    try { if (browser) await browser.close(); } catch (_) { /* ignore */ }
    return fail(e && e.message ? e.message : e);
  }
}

main();
