// discord-bot.js - Discord Bot for XZX Finder
const { Client, GatewayIntentBits, EmbedBuilder, REST, Routes } = require('discord.js');
const express = require('express');
const app = express();

const BOT_TOKEN = 'YOUR_DISCORD_BOT_TOKEN';
const CHANNEL_ID = 'YOUR_CHANNEL_ID';
const GUILD_ID = 'YOUR_GUILD_ID';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

let activeServers = [];
let lastEmbedMessage = null;

client.once('ready', () => {
    console.log(`✅ XZX Bot logged in as ${client.user.tag}`);
    
    // Update server list every 30 seconds
    setInterval(async () => {
        await updateServerEmbed();
    }, 30000);
});

// Update Discord embed with server list
async function updateServerEmbed() {
    try {
        const channel = await client.channels.fetch(CHANNEL_ID);
        if (!channel) return;
        
        // Sort servers by EPS
        const topServers = activeServers
            .sort((a, b) => b.eps - a.eps)
            .slice(0, 10);
        
        const embed = new EmbedBuilder()
            .setTitle('🎯 XZX FINDER - LIVE SERVERS')
            .setColor(0x9B59B6)
            .setTimestamp()
            .setFooter({ text: `Total: ${activeServers.length} servers | XZX v2.0` });
        
        if (topServers.length === 0) {
            embed.setDescription('No servers found. Waiting for reports...');
        } else {
            topServers.forEach((server, index) => {
                embed.addFields({
                    name: `${index + 1}. ${server.object || 'Unknown'}`,
                    value: `📊 **Players:** ${server.players || '0/20'} | ⚡ **EPS:** ${server.epsText || '0/s'}\n🆔 \`${server.jobId || 'No ID'}\``,
                    inline: false
                });
            });
            
            embed.addFields({
                name: '📡 Scanner Network',
                value: `${activeServers.length} active scanners | ${CONFIG.CATEGORIES.SECRET.length} Secret | ${CONFIG.CATEGORIES.BRAINROT.length} Brainrot | ${CONFIG.CATEGORIES.OG.length} OG`,
                inline: false
            });
        }
        
        // Edit existing message or send new one
        if (lastEmbedMessage) {
            try {
                const message = await channel.messages.fetch(lastEmbedMessage);
                await message.edit({ embeds: [embed] });
                return;
            } catch (e) {
                lastEmbedMessage = null;
            }
        }
        
        const msg = await channel.send({ embeds: [embed] });
        lastEmbedMessage = msg.id;
        
    } catch (error) {
        console.error('Failed to update embed:', error);
    }
}

// Handle server reports
client.on('messageCreate', async (message) => {
    if (message.channelId !== CHANNEL_ID) return;
    if (message.author.bot) return;
    
    // Parse JSON from message
    try {
        const data = JSON.parse(message.content);
        if (data.jobId && data.object) {
            // Update active servers list
            const existingIndex = activeServers.findIndex(s => s.jobId === data.jobId);
            if (existingIndex >= 0) {
                activeServers[existingIndex] = data;
            } else {
                activeServers.push(data);
            }
            
            // Keep only last 100 servers
            if (activeServers.length > 100) {
                activeServers = activeServers.slice(-100);
            }
        }
    } catch (e) {
        // Not JSON
    }
});

// Slash commands
const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand()) return;
    
    const { commandName } = interaction;
    
    if (commandName === 'servers') {
        await interaction.deferReply();
        
        const category = interaction.options.getString('category') || 'all';
        let servers = activeServers;
        
        if (category !== 'all') {
            servers = servers.filter(s => s.category === category.toUpperCase());
        }
        
        const embed = new EmbedBuilder()
            .setTitle(`📡 XZX Servers - ${category.toUpperCase()}`)
            .setColor(0x9B59B6)
            .setTimestamp();
        
        const topServers = servers
            .sort((a, b) => b.eps - a.eps)
            .slice(0, 5);
        
        if (topServers.length === 0) {
            embed.setDescription('No servers found.');
        } else {
            topServers.forEach((server, i) => {
                embed.addFields({
                    name: `${i+1}. ${server.object}`,
                    value: `Players: ${server.players} | EPS: ${server.epsText}\n\`${server.jobId}\``
                });
            });
        }
        
        await interaction.editReply({ embeds: [embed] });
    }
});

client.login(BOT_TOKEN);
