const { randomUUID } = require("node:crypto");

function requestLogger({ log = true } = {}) {
  return (req, res, next) => {
    req.id = req.get("X-Request-Id") || randomUUID();
    res.set("X-Request-Id", req.id);

    if (log) {
      const start = process.hrtime.bigint();
      res.on("finish", () => {
        const ms = Number(process.hrtime.bigint() - start) / 1e6;
        console.log(`[${req.id}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms.toFixed(1)} ms)`);
      });
    }

    next();
  };
}

module.exports = requestLogger;
