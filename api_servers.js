const WEBHOOK_URL =
  "https://canary.discord.com/api/webhooks/1446099568260284490/uzTRv__3K_DLzubkqejnpgliA84bn2-xvEyZRfbvih8_At9GjE9ZV5-BHkEjT1_7tMET"

let liveServers = {}

async function sendWebhook(data) {
  const embed = {
    title: "XZX HUB | BASE FINDER",
    color: 0x9b6cff,
    fields: [
      {
        name: "📦 Name",
        value: data.objectName,
        inline: false
      },
      {
        name: "💰 Worth",
        value: "N/A",
        inline: false
      },
      {
        name: "👥 Players",
        value: `${data.players}`,
        inline: false
      },
      {
        name: "🆔 Job ID (Mobile)",
        value: data.jobId,
        inline: false
      },
      {
        name: "🆔 Job ID (PC)",
        value: data.jobId,
        inline: false
      },
      {
        name: "🌐 Join Link",
        value: `[Click to Join](https://www.roblox.com/games/${data.placeId}?jobId=${data.jobId})`,
        inline: false
      }
    ],
    footer: {
      text: `PROVIDED BY XZX HUB | ${new Date().toLocaleString()}`
    }
  }

  await fetch(WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      embeds: [embed]
    })
  })
}

export default async function handler(req, res) {
  const now = Date.now()

  // Auto-delete expired servers (2 minutes)
  for (const jobId in liveServers) {
    if (now - liveServers[jobId].timestamp > 120000) {
      delete liveServers[jobId]
    }
  }

  if (req.method === "GET") {
    return res.status(200).json(Object.values(liveServers))
  }

  if (req.method === "POST") {
    const data = req.body

    if (!data.jobId || !data.placeId || !data.objectName) {
      return res.status(400).json({ error: "Missing fields" })
    }

    // Prevent duplicate spam
    if (liveServers[data.jobId]) {
      return res.status(200).json({ status: "already_logged" })
    }

    liveServers[data.jobId] = {
      ...data,
      timestamp: now
    }

    await sendWebhook(data)

    return res.status(200).json({ status: "logged" })
  }

  res.status(405).json({ error: "Method not allowed" })
}
