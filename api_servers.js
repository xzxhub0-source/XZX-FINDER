let liveServers = {}

export default function handler(req, res) {
  const now = Date.now()

  // Remove expired servers (2 minutes)
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

    liveServers[data.jobId] = {
      ...data,
      timestamp: now
    }

    return res.status(200).json({ status: "ok" })
  }

  res.status(405).json({ error: "Method not allowed" })
}
