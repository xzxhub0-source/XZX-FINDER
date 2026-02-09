import express from "express";

const app = express();
app.use(express.json());

const servers = new Map();
/*
structure:
jobId => {
  jobId,
  placeId,
  objectName,
  players,
  maxPlayers,
  lastSeen
}
*/

// Roblox posts detections here
app.post("/report", (req, res) => {
  const { jobId, placeId, objectName, players, maxPlayers } = req.body;
  if (!jobId || !objectName) {
    return res.status(400).json({ error: "Missing data" });
  }

  servers.set(jobId, {
    jobId,
    placeId,
    objectName,
    players: players || 0,
    maxPlayers: maxPlayers || 0,
    lastSeen: Date.now()
  });

  res.json({ ok: true });
});

// Roblox fetches servers here
app.get("/servers", (req, res) => {
  const now = Date.now();

  // auto clean old servers (10 min)
  for (const [id, s] of servers) {
    if (now - s.lastSeen > 10 * 60 * 1000) {
      servers.delete(id);
    }
  }

  res.json([...servers.values()]);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log("XZX Finder running on port", PORT)
);
