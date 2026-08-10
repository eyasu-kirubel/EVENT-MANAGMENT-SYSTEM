// Centralized Express error handler. The original backend relied on the
// default Express 500 page for anything that reached it without an explicit
// response; this preserves that behavior as a JSON response instead while
// still logging the full error for debugging.
function errorHandler(err, req, res, next) {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || "Internal server error." });
}

module.exports = { errorHandler };
