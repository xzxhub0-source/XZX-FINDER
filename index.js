const express = require("express");

const app = express();
app.use(express.json());

/* =========================
   CONFIG
========================= */

const PORT = process.env.PORT || 3000;
const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const API_KEY = process.env.API_KEY;

/* =========================
   IN-MEMORY STORAGE
========================= */

const servers = new Map();

/* =========================
   AUTH MIDDLEWARE
========================= */

function auth(req, res, next) {
  if (req.headers["x-api-key"] !== API_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

/* =========================
   DISCORD BOT MESSAGE
========================= */

async function sendDiscordMessage(data) {
  const content =
`🛰️ **OBJECT FOUND**
**Object:** ${data.objectName}
**Players:** ${data.players}
**PlaceId:** ${data.placeId}
**JobId:** ${data.jobId}`;

  await fetch(
    `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`,
    {
      method: "POST",
      headers: {
        "Authorization": `Bot ${BOT_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ content })
    }
  );
}

/* =========================
   REPORT ENDPOINT
========================= */

app.post("/api/report", auth, async (req, res) => {
  const { objectName, placeId, jobId, players } = req.body;

  if (!jobId || !placeId) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  if (!servers.has(jobId)) {
    const data = {
      objectName,
      placeId,
      jobId,
      players,
      lastSeen: Date.now()
    };

    servers.set(jobId, data);

    try {
      await sendDiscordMessage(data);
    } catch (err) {
      console.error("Discord error:", err.message);
    }
  }

  res.json({ success: true });
});

/* =========================
   FETCH SERVERS
========================= */

app.get("/api/servers", (_, res) => {
  res.json(
    Array.from(servers.values())
      .sort((a, b) => b.lastSeen - a.lastSeen)
  );
});

/* =========================
   CLEANUP
========================= */

setInterval(() => {
  const now = Date.now();
  for (const [jobId, data] of servers) {
    if (now - data.lastSeen > 10 * 60 * 1000) {
      servers.delete(jobId);
    }
  }
}, 60 * 1000);

/* =========================
   HEALTH CHECK
========================= */

app.get("/", (_, res) => {
  res.send("Roblox Server Scanner running ✅");
});

/* =========================
   START
========================= */

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
