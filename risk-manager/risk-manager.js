require("dotenv").config();
const Redis = require("ioredis");

// Use the same REDIS_URL as Agent 009
const redis = new Redis(process.env.REDIS_URL);
console.log("🛡️ AGENT 010: RISK MANAGER ONLINE");

async function monitorScout() {
    console.log("🧐 Watching for Whale signals from Agent 009...");

    // This agent "listens" to the whale-alerts channel
    redis.subscribe("whale-alerts", (err) => {
        if (err) console.error("❌ Subscription Error:", err);
    });

    redis.on("message", async (channel, message) => {
        const tradeData = JSON.parse(message);
        console.log(`\n🚨 RISK EVALUATION: Signature ${tradeData.signature.substring(0, 10)}...`);
        
        // FUTURE: This is where we add the "Rug Check" logic
        const isSafe = true; 
        
        if (isSafe) {
            console.log("✅ RISK CLEAR: Signaling the Executioner...");
            // We'll call the next agent "Agent 011: The Closer"
            redis.publish("execution-orders", JSON.stringify(tradeData));
        } else {
            console.log("❌ RISK HIGH: Trade Blocked.");
        }
    });
}

monitorScout();