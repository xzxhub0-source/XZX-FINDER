const fs = require("fs");
const fetch = require("node-fetch");
const { v4: uuidv4 } = require("uuid");

// Load all bases
const bases = JSON.parse(fs.readFileSync("./bases.json", "utf-8"));

// Discord webhooks
const WEBHOOKS = {
    Medium: "https://discord.com/api/webhooks/1469465650408984609/r_ZZ5hjRcPNJshgN1qBwaqR3_hecVv-fUkdQY8cfhDQfNer15FNHP7em1CZ2UHrw8K1W",
    High: "https://discord.com/api/webhooks/1469464935737327646/px6ZbQ3YgTEQOHaqofdZE4CRjzAB-ebCoe3K8v1NQf84wLWxf-ZUBqnNUjMr-dO1xjlm",
    Ultimate: "https://discord.com/api/webhooks/1469466144745455617/IA2to0yM18FsJx44BjoUlKd3wQRNeE_QGSEUJL39KiuDWjUNt69jfp0SBM6f2JgJ7D_a"
};

// Utility: create embed object for Discord
function createEmbed(base) {
    const jobIdMobile = uuidv4();
    const jobIdPC = uuidv4();
    const timestamp = new Date().toISOString();

    return {
        username: "XZX HUB | BASE FINDER",
        avatar_url: "https://i.imgur.com/YOUR_AVATAR.png",
        embeds: [
            {
                title: `📛 ${base.name}`,
                description: "**Premium Roblox Base Finder Result**",
                color: 0x1f1f1f, // dark color
                fields: [
                    { name: "💰 Worth", value: base.worth || "N/A", inline: true },
                    { name: "👥 Players", value: "0/0", inline: true },
                    { name: "🆔 Job ID (Mobile)", value: `\`\`\`${jobIdMobile}\`\`\``, inline: true },
                    { name: "🆔 Job ID (PC)", value: `\`\`\`${jobIdPC}\`\`\``, inline: true },
                    { name: "🌐 Join Link", value: "[Click to Join](https://www.roblox.com/games/)", inline: true }
                ],
                footer: {
                    text: `| PROVIDED BY XZX HUB | AT ${timestamp}`,
                    icon_url: "https://i.imgur.com/YOUR_AVATAR.png"
                },
                timestamp: timestamp
            }
        ]
    };
}

// Send a single embed to webhook
async function sendEmbed(webhookURL, embed) {
    try {
        const res = await fetch(webhookURL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(embed)
        });
        if (!res.ok) console.error("Failed to send:", res.statusText);
    } catch (err) {
        console.error("Error sending embed:", err);
    }
}

// Send all bases per tier
async function sendAllBases() {
    for (const tier in bases) {
        for (const base of bases[tier]) {
            const embed = createEmbed(base);
            await sendEmbed(WEBHOOKS[tier], embed);
            console.log(`Sent ${base.name} to ${tier} webhook`);
            await new Promise(r => setTimeout(r, 500)); // small delay to avoid rate limits
        }
    }
}

// Run
sendAllBases();
