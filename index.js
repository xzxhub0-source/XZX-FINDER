const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let servers = {};
const EXPIRE_MS = 60 * 1000;

// Report endpoint
app.post("/api/report", (req, res) => {
  const { object, jobId, players, eps, timestamp } = req.body;

  if (!object || !jobId) {
    return res.status(400).json({ error: "Missing data" });
  }

  servers[jobId] = {
    object,
    jobId,
    players: players || 0,
    eps: eps || 0,
    timestamp: timestamp || Math.floor(Date.now() / 1000)
  };

  res.json({ success: true });
});

// Fetch endpoint
app.get("/api/servers", (req, res) => {
  const now = Date.now();

  for (const id in servers) {
    if (now - servers[id].timestamp * 1000 > EXPIRE_MS) {
      delete servers[id];
    }
  }

  res.json(Object.values(servers));
});

// Root health check
app.get("/", (req, res) => {
  res.send("XZX Server Finder backend online");
});

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`XZX Finder backend running on port ${PORT}`);
});

// Graceful shutdown (prevents scary logs)
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down cleanly");
  server.close(() => process.exit(0));
});
