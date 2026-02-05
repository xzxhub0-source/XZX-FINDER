import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const BOT_TOKEN = process.env.BOT_TOKEN;
const CHANNEL_ID = process.env.CHANNEL_ID;
const API_KEY = process.env.API_KEY;
const PORT = process.env.PORT || 3000;

// In-memory server storage
const servers = new Map();

// Auth middleware
function auth(req, res, next) {
  if (req.headers["x-api-key"] !== API_KEY) {
    return res.status(403).json({ error: "Forbidden" });
  }
  next();
}

// Receive scan data
app.post("/report", auth, async (req, res) => {
  const { objectName, jobId, placeId } = req.body;
  if (!objectName || !jobId || !placeId) {
    return res.status(400).json({ error: "Invalid payload" });
  }

  if (!servers.has(jobId)) {
    servers.set(jobId, {
      objectName,
      jobId,
      placeId,
      time: Date.now()
    });

    // Send Discord message
    await fetch(
      `https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bot ${BOT_TOKEN}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content:
            `🔍 **Object Found**\n` +
            `**Name:** ${objectName}\n` +
            `**PlaceId:** ${placeId}\n` +
            `**JobId:** ${jobId}`
        })
      }
    );
  }

  res.json({ success: true });
});

// Serve server list
app.get("/servers", (req, res) => {
  res.json([...servers.values()]);
});

app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});
