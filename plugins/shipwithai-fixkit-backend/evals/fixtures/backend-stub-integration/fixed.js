'use strict';
// Fixed form: the boundary normalizes trailing slash(es) before logging/dispatch.
function handleAtBoundary(req, log) {
  const normalizedPath = req.path.replace(/\/+$/, '') || '/';   // strip trailing slash(es)
  log.push({ method: req.method, normalizedPath, status: 200 });
  return { status: 200 };
}
module.exports = { handleAtBoundary };
