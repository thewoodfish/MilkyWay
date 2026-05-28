const express = require("express");

const app = express();
const PORT = process.env.PORT || 3001;

const NAME = "Hello Agent";
const VERSION = "1.0.0";

app.use(express.json());

// Required by MilkyWay verification oracle
app.get("/health", (_req, res) => {
  res.json({ name: NAME, version: VERSION, status: "ok" });
});

// Stub endpoint — will be the actual agent interface in Phase 2
app.post("/run", (_req, res) => {
  res.json({
    result: "Hello from the MilkyWay test agent!",
    agent: NAME,
    version: VERSION,
  });
});

app.listen(PORT, () => {
  console.log(`${NAME} v${VERSION} running on http://localhost:${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
});
