// api/servers.js
let liveServers = {} // in-memory store

export default function handler(req, res) {
  const now = Date.now()

  // Remove expired entries (older than 2 minutes)
  Object.keys(liveServers).forEach(jobId => {
    if (now - liveServers[jobId].timestamp > 120000) delete liveServers[jobId]
  })

  if (req.method === "GET") {
    // Return live servers
    res.status(200).json(Object.values(liveServers))
  } 
  else if (req.method === "POST") {
    // Add/update a server
    try {
      const data = req.body
      if (!data.jobId || !data.placeId || !data.objectName) {
        res.status(400).json({error: "Missing required fields"})
        return
      }
      liveServers[data.jobId] = {...data, timestamp: now}
      res.status(200).json({status: "ok"})
    } catch (e) {
      res.status(500).json({error: e.message})
    }
  } 
  else {
    res.status(405).json({error: "Method not allowed"})
  }
}
