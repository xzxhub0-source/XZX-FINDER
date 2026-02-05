const { Client, GatewayIntentBits } = require("discord.js");

// Node 18+ has fetch built in — DO NOT REQUIRE node-fetch
// const fetch = require("node-fetch"); ❌ REMOVE THIS

const BOT_TOKEN = process.env.BOT_TOKEN || "PUT_YOUR_BOT_TOKEN_HERE";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once("ready", () => {
  console.log(`✅ Logged in as ${client.user.tag}`);
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;

  if (message.content === "!ping") {
    message.reply("pong 🏓");
  }

  if (message.content.startsWith("!fetch")) {
    try {
      const res = await fetch("https://games.roblox.com/v1/games/1818/servers/Public?limit=10");
      const data = await res.json();

      message.reply(`Fetched ${data.data?.length || 0} servers`);
    } catch (err) {
      console.error(err);
      message.reply("❌ Fetch failed");
    }
  }
});

client.login(BOT_TOKEN);
