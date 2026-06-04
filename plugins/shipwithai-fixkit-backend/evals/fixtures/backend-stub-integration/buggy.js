'use strict';
// Synthetic backend INTEGRATION/System bug (backend-stub-integration), ORIGINAL failing form.
// A request crosses a service boundary; we instrument the boundary (the `log` array) BEFORE
// touching code -- the System reproduce idiom (doc 09 §7). BUG: the trailing slash is not
// normalized, so the boundary emits normalizedPath '/api/x/' instead of '/api/x'.
function handleAtBoundary(req, log) {
  const normalizedPath = req.path;                 // BUG: no trailing-slash normalization
  log.push({ method: req.method, normalizedPath, status: 200 });
  return { status: 200 };
}
module.exports = { handleAtBoundary };
