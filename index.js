const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// In-memory server store
let servers = {};
const EXPIRE_MS = 60 * 1000; // 60 seconds

// Roblox reports a server
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

// Roblox GUI fetches servers
app.get("/api/servers", (req, res) => {
  const now = Date.now();

  for (const id in servers) {
    if (now - servers[id].timestamp * 1000 > EXPIRE_MS) {
      delete servers[id];
    }
  }

  res.json(Object.values(servers));
});

// Health check (optional but useful)
app.get("/", (req, res) => {
  res.send("XZX Server Finder backend online");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`XZX Finder backend running on port ${PORT}`);
});
