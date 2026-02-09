require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { Client, GatewayIntentBits } = require("discord.js");

const app = express();
app.use(cors());
app.use(express.json());

let activeServers = {};

const cleanInterval = 60 * 1000;

// Discord Bot
const bot = new Client({ intents: [GatewayIntentBits.Guilds] });

bot.once("ready", () => {
  console.log("Discord Bot Online!");
});
bot.login(process.env.DISCORD_TOKEN);

// POST /api/report
app.post("/api/report", (req, res) => {
    const { object, jobId, players, eps, timestamp } = req.body;

    activeServers[jobId] = {
        object,
        jobId,
        players,
        eps,
        timestamp
    };

    res.send({ ok: true });
});

// GET /api/servers
app.get("/api/servers", (req, res) => {
    const now = Date.now();
    for (let key in activeServers) {
        if (now - (activeServers[key].timestamp * 1000) > cleanInterval)
            delete activeServers[key];
    }
    res.json(Object.values(activeServers));
});

// Start
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on ${PORT}`));
