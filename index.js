import fs from "fs";
import fetch from "node-fetch";
import { v4 as uuidv4 } from "uuid";

// Load your JSON bases (medium, high, ultimate)
import mediumBases from "./medium.json" assert { type: "json" };
import highBases from "./high.json" assert { type: "json" };
import ultimateBases from "./ultimate.json" assert { type: "json" };

// Webhook URLs (from Railway ENV)
const MEDIUM_WEBHOOK = process.env.MEDIUM_WEBHOOK;
const HIGH_WEBHOOK = process.env.HIGH_WEBHOOK;
const ULTIMATE_WEBHOOK = process.env.ULTIMATE_WEBHOOK;

// Helper to create Discord embed
function createEmbed(baseName, worth, joinLink) {
  const timestamp = new Date().toISOString();
  return {
    embeds: [
      {
        title: "| XZX HUB | BASE FINDER |",
        description: "🔍 Detailed Roblox Base Finder Result",
        color: 0x2f3136, // dark Discord-like color
        fields: [
          { name: "📛 Name", value: baseName, inline: true },
          { name: "💰 Worth", value: worth || "N/A", inline: true },
          { name: "👥 Players", value: "0/0", inline: true },
          { name: "🆔 Job ID (Mobile)", value: `\`${uuidv4()}\``, inline: true },
          { name: "🆔 Job ID (PC)", value: `\`${uuidv4()}\``, inline: true },
          { name: "🌐 Join Link", value: `[Click to Join](${joinLink})`, inline: true }
        ],
        footer: {
          text: `| PROVIDED BY XZX HUB | AT ${timestamp}`
        }
      }
    ]
  };
}

// Send base to Discord
async function sendToDiscord(base, tier) {
  let webhook = ULTIMATE_WEBHOOK;
  if (tier === "high") webhook = HIGH_WEBHOOK;
  if (tier === "medium") webhook = MEDIUM_WEBHOOK;

  const embedPayload = createEmbed(base.name, base.worth, base.link || "https://roblox.com");
  try {
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(embedPayload)
    });
    if (!res.ok) console.error(`Failed to send ${base.name} to Discord: ${res.status}`);
  } catch (err) {
    console.error("Discord webhook error:", err);
  }
}

// Send all bases
async function sendAllBases() {
  for (const base of mediumBases) await sendToDiscord(base, "medium");
  for (const base of highBases) await sendToDiscord(base, "high");
  for (const base of ultimateBases) await sendToDiscord(base, "ultimate");
  console.log("✅ All bases sent to Discord!");
}

sendAllBases();
