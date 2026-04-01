require("dotenv").config();
const { ethers } = require("ethers");
const Redis = require("ioredis");

// 1. THE BRAIN (Internal Redis Mesh)
const redis = new Redis(process.env.REDIS_URL);

// 2. THE EYES (Base Network - Ethers v6)
const PROVIDER_URL = process.env.BASE_WSS_URL || "wss://mainnet.base.org";
const provider = new ethers.WebSocketProvider(PROVIDER_URL);

// Targeting Uniswap V3 on Base
const UNISWAP_V3_ROUTER = "0x2626664c3603398794630971918fd21ef5834510";
const WHALE_THRESHOLD_ETH = 2.0; // Only alert on 2+ ETH trades

console.log("-----------------------------------------");
console.log("🕵️‍♂️ AGENT 007: BASE WHALE SCOUT ONLINE");
console.log(`📡 MONITORING: Uniswap V3 for trades > ${WHALE_THRESHOLD_ETH} ETH`);

async function startScout() {
    // Listen for every new block
    provider.on("block", async (blockNumber) => {
        try {
            // Get block with full transaction objects
            const block = await provider.getBlock(blockNumber, true);
            if (!block || !block.transactions) return;

            for (const tx of block.prefetchedTransactions) {
                // Check if the trade is going to Uniswap
                if (tx.to && tx.to.toLowerCase() === UNISWAP_V3_ROUTER.toLowerCase()) {
                    
                    const valueInEth = parseFloat(ethers.formatEther(tx.value));

                    if (valueInEth >= WHALE_THRESHOLD_ETH) {
                        console.log(`\n🚨 BASE WHALE DETECTED: ${valueInEth.toFixed(2)} ETH`);
                        
                        const tradeSignal = {
                            network: "BASE",
                            trader: tx.from,
                            amount: valueInEth,
                            txHash: tx.hash,
                            timestamp: Date.now()
                        };

                        // BROADCAST TO MESH
                        await redis.publish("whale-alerts", JSON.stringify(tradeSignal));
                        console.log(`🔗 Signal sent to Agent 010 (Risk Manager).`);
                    }
                }
            }
        } catch (err) {
            // Quietly handle busy blocks
        }
    });
}

startScout();