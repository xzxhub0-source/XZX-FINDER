const express = require('express');
const app = express();
app.use(express.json());

// ==================== CONFIGURATION ====================
const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
const MAX_SERVERS = 500; // Maximum servers to store

// ==================== IN-MEMORY STORAGE ====================
const servers = new Map(); // jobId -> server data
const reportedIPs = new Map(); // Simple rate limiting

// ==================== DISCORD BOT SETUP ====================
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
let discordClient = null;
let discordReady = false;

async function initDiscordBot() {
    if (!process.env.DISCORD_BOT_TOKEN || !process.env.DISCORD_CHANNEL_ID) {
        console.log('⚠️ Discord bot not configured - skipping initialization');
        return;
    }

    try {
        discordClient = new Client({ 
            intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] 
        });

        discordClient.once('ready', () => {
            console.log(`✅ Discord bot logged in as ${discordClient.user.tag}`);
            discordReady = true;
        });

        await discordClient.login(process.env.DISCORD_BOT_TOKEN);
    } catch (error) {
        console.error('❌ Discord bot failed to initialize:', error.message);
        discordReady = false;
    }
}

async function sendDiscordEmbed(data) {
    if (!discordReady || !discordClient) return;

    try {
        const channel = await discordClient.channels.fetch(process.env.DISCORD_CHANNEL_ID);
        if (!channel) return;

        const embed = new EmbedBuilder()
            .setTitle(`🎯 **${data.object}** Discovered!`)
            .setDescription(`
                **Server Details:**
                \`\`\`yaml
Job ID: ${data.jobId}
Players: ${data.players}
EPS: ${data.eps.toLocaleString()}
                \`\`\`
            `)
            .setColor(0x9B59B6) // Purple
            .setTimestamp()
            .setFooter({ 
                text: 'XZX Hub Finder • Live Scanner', 
                iconURL: 'https://i.imgur.com/6J3rXxk.png' 
            })
            .setThumbnail('https://i.imgur.com/6J3rXxk.png');

        await channel.send({ embeds: [embed] });
        console.log(`📤 Discord embed sent for ${data.object} (${data.eps} EPS)`);
    } catch (error) {
        console.error('❌ Failed to send Discord embed:', error.message);
    }
}

// ==================== CLEANUP SERVICE ====================
function cleanupExpiredServers() {
    const now = Date.now();
    let expired = 0;

    for (const [jobId, data] of servers.entries()) {
        if (now - data.timestamp > EXPIRY_MS) {
            servers.delete(jobId);
            expired++;
        }
    }

    // Prevent memory overflow
    if (servers.size > MAX_SERVERS) {
        const sorted = [...servers.entries()].sort((a, b) => a[1].timestamp - b[1].timestamp);
        const toDelete = sorted.slice(0, servers.size - MAX_SERVERS);
        toDelete.forEach(([jobId]) => servers.delete(jobId));
        console.log(`🧹 Memory cleanup: removed ${toDelete.length} oldest servers`);
    }

    if (expired > 0) {
        console.log(`🧹 Cleanup: removed ${expired} expired servers (${servers.size} active)`);
    }
}

setInterval(cleanupExpiredServers, CLEANUP_INTERVAL);

// ==================== API ENDPOINTS ====================

// Health check
app.get('/', (req, res) => {
    res.json({
        status: 'online',
        servers: servers.size,
        discord: discordReady,
        uptime: process.uptime()
    });
});

// POST /api/report - Receive scanner data
app.post('/api/report', async (req, res) => {
    const { object, jobId, players, eps, timestamp } = req.body;
    
    // Validation
    if (!jobId || !eps) {
        return res.status(400).json({ 
            error: 'Missing required fields',
            required: ['jobId', 'eps'] 
        });
    }

    // Rate limiting by IP
    const clientIp = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const lastReport = reportedIPs.get(clientIp) || 0;
    
    if (now - lastReport < 30000) { // 30 seconds cooldown
        return res.status(429).json({ 
            error: 'Rate limited', 
            retryAfter: 30 
        });
    }
    reportedIPs.set(clientIp, now);

    // Clean old IP records
    if (reportedIPs.size > 1000) {
        const oldest = now - 3600000; // 1 hour
        for (const [ip, time] of reportedIPs.entries()) {
            if (time < oldest) reportedIPs.delete(ip);
        }
    }

    try {
        const existing = servers.get(jobId);
        
        // Only update if this is new or has higher EPS
        if (!existing || eps > existing.eps) {
            const serverData = {
                object,
                jobId,
                players: players || '0 / 0',
                eps: Math.round(eps),
                timestamp: timestamp || now,
                firstSeen: existing ? existing.firstSeen : now,
                reportCount: existing ? existing.reportCount + 1 : 1
            };

            servers.set(jobId, serverData);
            console.log(`📥 New report: ${object} | ${eps} EPS | ${jobId.substring(0,8)}...`);

            // Send Discord notification for high EPS servers
            if (eps >= 1000 && discordReady) {
                await sendDiscordEmbed(serverData);
            }
        }

        res.json({ 
            status: 'success',
            serverCount: servers.size,
            isNew: !existing,
            isHigher: existing ? eps > existing.eps : true
        });

    } catch (error) {
        console.error('❌ Error processing report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/servers - Get active servers
app.get('/api/servers', (req, res) => {
    const now = Date.now();
    const activeServers = [];
    const search = req.query.search ? req.query.search.toLowerCase() : '';
    const minEps = req.query.minEps ? parseInt(req.query.minEps) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;

    for (const data of servers.values()) {
        // Check expiry
        if (now - data.timestamp > EXPIRY_MS) {
            continue;
        }

        // Apply filters
        if (search && !data.object.toLowerCase().includes(search)) {
            continue;
        }
        if (data.eps < minEps) {
            continue;
        }

        activeServers.push(data);
    }

    // Sort by EPS descending
    activeServers.sort((a, b) => b.eps - a.eps);
    
    // Apply limit
    const limited = activeServers.slice(0, limit);

    res.json({
        count: limited.length,
        total: activeServers.length,
        servers: limited,
        timestamp: now
    });
});

// GET /api/servers/:jobId - Get specific server
app.get('/api/servers/:jobId', (req, res) => {
    const server = servers.get(req.params.jobId);
    if (!server) {
        return res.status(404).json({ error: 'Server not found' });
    }
    
    const now = Date.now();
    if (now - server.timestamp > EXPIRY_MS) {
        servers.delete(req.params.jobId);
        return res.status(404).json({ error: 'Server expired' });
    }

    res.json(server);
});

// GET /api/stats - Get system statistics
app.get('/api/stats', (req, res) => {
    const now = Date.now();
    let totalEps = 0;
    let uniqueObjects = new Set();

    for (const data of servers.values()) {
        if (now - data.timestamp <= EXPIRY_MS) {
            totalEps += data.eps;
            uniqueObjects.add(data.object);
        }
    }

    res.json({
        activeServers: servers.size,
        uniqueObjects: uniqueObjects.size,
        totalEps: totalEps,
        averageEps: servers.size > 0 ? Math.round(totalEps / servers.size) : 0,
        discordConnected: discordReady,
        uptime: process.uptime()
    });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

async function startServer() {
    await initDiscordBot();
    
    app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════════════╗
║     XZX Hub Finder Backend v1.0.0        ║
╠══════════════════════════════════════════╣
║  📡 Port: ${PORT.padEnd(30)} ║
║  🧹 Expiry: ${(EXPIRY_MS/60000).toFixed(0)} minutes${' '.padEnd(18)} ║
║  🤖 Discord: ${discordReady ? '✅' : '❌'}${' '.padEnd(27)} ║
╚══════════════════════════════════════════╝
        `);
    });
}

startServer().catch(console.error);

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received - shutting down gracefully');
    if (discordClient) discordClient.destroy();
    process.exit(0);
});
