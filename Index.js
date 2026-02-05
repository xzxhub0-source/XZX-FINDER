import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// ==== CONFIG ====
const BOT_TOKEN = process.env.BOT_TOKEN; // Your bot token here
const CHANNEL_ID = process.env.CHANNEL_ID; // Channel to send messages to

const servers = new Map(); // jobId -> server data

// ==== HELPER: SEND MESSAGE VIA BOT ====
async function sendBotMessage(content) {
	await fetch(`https://discord.com/api/v10/channels/${CHANNEL_ID}/messages`, {
		method: "POST",
		headers: {
			"Authorization": `Bot ${BOT_TOKEN}`,
			"Content-Type": "application/json"
		},
		body: JSON.stringify({ content })
	});
}

// ==== REPORT ENDPOINT ====
app.post("/report", async (req, res) => {
	const data = req.body;
	if (!data?.jobId) return res.sendStatus(400);

	if (!servers.has(data.jobId)) {
		servers.set(data.jobId, data);

		// Send message via bot
		const msg = 
`🛰 **Object Found**
**Name:** ${data.objectName}
**JobId:** ${data.jobId}
**Players:** ${data.players}`;
		await sendBotMessage(msg);
	}

	res.sendStatus(200);
});

// ==== SERVERS FETCH FOR GUI ====
app.get("/servers", (req, res) => {
	res.json([...servers.values()]);
});

app.listen(3000, () => console.log("Relay running with Bot Token"));
