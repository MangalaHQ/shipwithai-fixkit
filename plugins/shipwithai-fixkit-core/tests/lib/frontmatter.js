'use strict';
// Re-export shim. The real parser was promoted to lib/frontmatter.js so lib/pattern-miner.js can
// reuse it without lib/ depending on tests/. This shim keeps the gate's existing require path and
// the parser unit tests untouched. See ../../lib/frontmatter.js.
module.exports = require('../../lib/frontmatter');
