// index.js
import fs from "fs";
import path from "path";

// Path to your JSON file
const jsonPath = path.resolve("./bases.json");

// Load JSON
let bases;
try {
    const rawData = fs.readFileSync(jsonPath, "utf8");
    bases = JSON.parse(rawData);
    console.log("✅ Bases loaded successfully!");
} catch (err) {
    console.error("❌ Error loading JSON file:", err);
    process.exit(1); // Stop if file can't be read
}

// Function to search a base by name (case-insensitive)
function findBaseByName(name) {
    const tiers = ["Medium", "High", "Ultimate"];
    for (const tier of tiers) {
        const base = bases[tier].find(b => b.name.toLowerCase() === name.toLowerCase());
        if (base) return { tier, ...base };
    }
    return null;
}

// Example usage:
const searchName = "Pandanini Frostini";
const result = findBaseByName(searchName);

if (result) {
    console.log(`Found base: ${result.name}`);
    console.log(`Tier: ${result.tier}`);
    console.log(`Worth: ${result.worth}`);
} else {
    console.log(`Base "${searchName}" not found.`);
}

// Optional: list all bases in a tier
console.log("\nAll Medium Bases:");
bases.Medium.forEach(b => console.log(`${b.name} - ${b.worth}`));
