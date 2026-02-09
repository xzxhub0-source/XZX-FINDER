// ======================
// XZX Finder Backend
// ES Module version for Railway
// ======================

import express from "express";

const app = express();
app.use(express.json());

console.log("Starting XZX Finder backend...");

// ======================
// In-memory server store
// ======================
const servers = new Map();

// ======================
// POST /report
// Receive server info from Roblox clients
// Body: { jobId, placeId, objectName, players, maxPlayers }
// ======================
app.post("/report", (req, res) => {
  const { jobId, placeId, objectName, players, maxPlayers } = req.body;

  if (!jobId || !objectName) {
    return res.status(400).json({ error: "Missing jobId or objectName" });
  }

  servers.set(jobId, {
    jobId,
    placeId,
    objectName,
    players: players || 0,
    maxPlayers: maxPlayers || 0,
    lastSeen: Date.now()
  });

  res.json({ success: true });
});

// ======================
// GET /servers
// Return all active servers
// ======================
app.get("/servers", (req, res) => {
  const now = Date.now();

  // Remove servers older than 10 minutes
  for (const [id, server] of servers.entries()) {
    if (now - server.lastSeen > 10 * 60 * 1000) {
      servers.delete(id);
    }
  }

  res.json(Array.from(servers.values()));
});

// ======================
// Start server
// ======================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`XZX Finder backend running on port ${PORT}`);
});
