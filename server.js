const express = require('express');
const app = express();
app.use(express.json());

// ==================== CONFIGURATION ====================
const EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const CLEANUP_INTERVAL = 60 * 1000; // 1 minute
const MAX_SERVERS = 500;

// ==================== IN-MEMORY STORAGE ====================
const servers = new Map();
const reportedIPs = new Map();

// ==================== DISCORD BOT SETUP (OPTIONAL) ====================
let discordClient = null;
let discordReady = false;

// Only attempt Discord if token exists AND is valid format
if (process.env.DISCORD_BOT_TOKEN && 
    process.env.DISCORD_BOT_TOKEN.length > 10 &&
    process.env.DISCORD_CHANNEL_ID) {
    
    try {
        const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
        
        async function initDiscordBot() {
            try {
                discordClient = new Client({ 
                    intents: [GatewayIntentBits.Guilds] 
                });

                discordClient.once('ready', () => {
                    console.log(`✅ Discord bot logged in as ${discordClient.user.tag}`);
                    discordReady = true;
                });

                // Don't await here - let it run async
                discordClient.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
                    console.log('⚠️ Discord bot login failed - continuing without Discord');
                    discordReady = false;
                });
            } catch (error) {
                console.log('⚠️ Discord bot initialization skipped - continuing without Discord');
                discordReady = false;
            }
        }
        
        initDiscordBot();
    } catch (error) {
        console.log('⚠️ Discord.js not available - continuing without Discord');
        discordReady = false;
    }
} else {
    console.log('ℹ️ Discord bot not configured - running in API-only mode');
}

async function sendDiscordEmbed(data) {
    if (!discordReady || !discordClient) return;
    
    try {
        const channel = await discordClient.channels.fetch(process.env.DISCORD_CHANNEL_ID);
        if (!channel) return;

        const { EmbedBuilder } = require('discord.js');
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
            .setColor(0x9B59B6)
            .setTimestamp()
            .setFooter({ 
                text: 'XZX Hub Finder • Live Scanner'
            });

        await channel.send({ embeds: [embed] });
        console.log(`📤 Discord: ${data.object} (${data.eps} EPS)`);
    } catch (error) {
        // Silently fail - don't crash the server
        discordReady = false;
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
        uptime: process.uptime(),
        endpoints: ['/api/servers', '/api/report', '/api/stats']
    });
});

// GET /api/servers - Get active servers
app.get('/api/servers', (req, res) => {
    const now = Date.now();
    const activeServers = [];
    const search = req.query.search ? req.query.search.toLowerCase() : '';
    const minEps = req.query.minEps ? parseInt(req.query.minEps) : 0;
    const limit = req.query.limit ? parseInt(req.query.limit) : 100;

    for (const data of servers.values()) {
        if (now - data.timestamp > EXPIRY_MS) continue;
        if (search && !data.object.toLowerCase().includes(search)) continue;
        if (data.eps < minEps) continue;

        activeServers.push(data);
    }

    activeServers.sort((a, b) => b.eps - a.eps);
    const limited = activeServers.slice(0, limit);

    res.json({
        count: limited.length,
        total: activeServers.length,
        servers: limited,
        timestamp: now
    });
});

// POST /api/report - Receive scanner data
app.post('/api/report', async (req, res) => {
    const { object, jobId, players, eps, timestamp } = req.body;
    
    if (!jobId || !eps) {
        return res.status(400).json({ 
            error: 'Missing required fields',
            required: ['jobId', 'eps'] 
        });
    }

    // Rate limiting
    const clientIp = req.ip || req.connection.remoteAddress || '0.0.0.0';
    const now = Date.now();
    const lastReport = reportedIPs.get(clientIp) || 0;
    
    if (now - lastReport < 30000) {
        return res.status(429).json({ 
            error: 'Rate limited', 
            retryAfter: 30 
        });
    }
    reportedIPs.set(clientIp, now);

    try {
        const existing = servers.get(jobId);
        
        if (!existing || eps > existing.eps) {
            const serverData = {
                object: object || 'Unknown',
                jobId,
                players: players || '0/0',
                eps: Math.round(eps),
                timestamp: timestamp || now,
                firstSeen: existing ? existing.firstSeen : now,
                reportCount: existing ? existing.reportCount + 1 : 1
            };

            servers.set(jobId, serverData);
            console.log(`📥 ${object || 'Unknown'} | ${eps} EPS | ${jobId.substring(0,8)}...`);

            // Send Discord notification (non-blocking)
            if (eps >= 1000 && discordReady) {
                sendDiscordEmbed(serverData).catch(() => {});
            }
        }

        res.json({ 
            status: 'success',
            serverCount: servers.size
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/stats - System statistics
app.get('/api/stats', (req, res) => {
    const now = Date.now();
    let totalEps = 0;
    let uniqueObjects = new Set();
    let activeCount = 0;

    for (const data of servers.values()) {
        if (now - data.timestamp <= EXPIRY_MS) {
            activeCount++;
            totalEps += data.eps;
            uniqueObjects.add(data.object);
        }
    }

    res.json({
        activeServers: activeCount,
        totalServers: servers.size,
        uniqueObjects: uniqueObjects.size,
        totalEps: totalEps,
        averageEps: activeCount > 0 ? Math.round(totalEps / activeCount) : 0,
        discordConnected: discordReady,
        uptime: process.uptime()
    });
});

// ==================== START SERVER ====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔══════════════════════════════════════════╗
║     XZX Hub Finder Backend v1.0.0        ║
╠══════════════════════════════════════════╣
║  📡 URL: https://xzx-finder-production.up.railway.app ║
║  📡 Port: ${PORT}                          ║
║  🧹 Expiry: ${EXPIRY_MS/60000} minutes                  ║
║  🤖 Discord: ${discordReady ? '✅' : '❌'}                       ║
║  🌐 Status: ONLINE                       ║
╚══════════════════════════════════════════╝
    `);
});
