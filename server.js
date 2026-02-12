const express = require('express');
const app = express();
app.use(express.json());

// In-memory store: jobId -> { object, jobId, players, eps, timestamp, objectName }
const servers = new Map();
const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

// Cleanup expired servers every minute
setInterval(() => {
  const now = Date.now();
  for (const [jobId, data] of servers) {
    if (now - data.timestamp > EXPIRY_MS) {
      servers.delete(jobId);
    }
  }
}, 60_000);

// ---------- POST /api/report ----------
app.post('/api/report', (req, res) => {
  const { object, jobId, players, eps, timestamp } = req.body;
  if (!jobId || !eps) return res.status(400).send('Missing fields');

  const existing = servers.get(jobId);
  // Keep only the highest EPS for this server
  if (!existing || eps > existing.eps) {
    servers.set(jobId, {
      object,          // object name of the highest EPS pet
      jobId,
      players,
      eps,
      timestamp: timestamp || Date.now(),
      objectName: object
    });
  }

  // Forward to Discord (if bot token is set)
  if (process.env.DISCORD_BOT_TOKEN && process.env.DISCORD_CHANNEL_ID) {
    sendDiscordMessage(req.body).catch(console.error);
  }

  res.status(200).json({ status: 'ok' });
});

// ---------- GET /api/servers ----------
app.get('/api/servers', (req, res) => {
  const now = Date.now();
  const active = [];
  for (const data of servers.values()) {
    if (now - data.timestamp <= EXPIRY_MS) {
      active.push(data);
    }
  }
  // Sort by EPS descending (best servers first)
  active.sort((a, b) => b.eps - a.eps);
  res.json(active);
});

// ---------- Discord Bot (REST, no discord.js needed) ----------
async function sendDiscordMessage(payload) {
  const embed = {
    title: `🎯 ${payload.object}`,
    description: `**JobId:** \`${payload.jobId}\`\n**Players:** ${payload.players}\n**EPS:** ${payload.eps}`,
    color: 0x00ff00,
    timestamp: new Date().toISOString()
  };

  await fetch(`https://discord.com/api/v10/channels/${process.env.DISCORD_CHANNEL_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ embeds: [embed] })
  });
}

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
