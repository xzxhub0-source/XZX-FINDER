# XZX Finder Backend

Backend for the XZX Finder Roblox system.

## Endpoints

GET /api/servers  
Returns live servers where the object was found.

POST /api/servers  
Body:
{
  "jobId": "string",
  "placeId": number,
  "objectName": "string",
  "players": number
}

Entries expire after 2 minutes.
