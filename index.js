// index.js
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch"; // If using Node 18+, fetch is global. Otherwise, install node-fetch

// __dirname workaround for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Config
const WEBHOOK_URL = process.env.WEBHOOK_URL || "YOUR_WEBHOOK_URL_HERE"; // set in Railway secrets

// Load JSON helper
async function loadJSON(fileName) {
    const filePath = path.join(__dirname, fileName);
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
}

// Send to webhook
async function sendWebhook(message) {
    if (!WEBHOOK_URL) return;
    try {
        await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: message })
        });
    } catch (err) {
        console.error("Webhook error:", err);
    }
}

// Main function
async function main() {
    try {
        const mediumBases = await loadJSON("medium.json");
        const highBases = await loadJSON("high.json");
        const ultimateBases = await loadJSON("ultimate.json");

        console.log("✅ Medium Bases Loaded:", mediumBases.length);
        console.log("✅ High Bases Loaded:", highBases.length);
        console.log("✅ Ultimate Bases Loaded:", ultimateBases.length);

        // Example: send first medium base to webhook
        if (mediumBases.length > 0) {
            const base = mediumBases[0];
            await sendWebhook(`Medium Base Found: ${base.name} - $${base.earning}`);
        }

        // Your base finding logic here
        // Iterate over all categories
        for (const base of [...mediumBases, ...highBases, ...ultimateBases]) {
            console.log(`Base: ${base.name} | Earnings: $${base.earning}`);
            // Optionally send webhook
            // await sendWebhook(`Found Base: ${base.name} - $${base.earning}`);
        }

    } catch (err) {
        console.error("Error loading JSON files:", err);
    }
}

// Run
main();
