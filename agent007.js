const { ethers } = require('ethers');

// Empire Environment Variables
const PROVIDER_URL = process.env.BASE_RPC_URL || "https://mainnet.base.org";
const PRIVATE_KEY = process.env.WALLET_PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000000"; 
const UNISWAP_V3_ROUTER = "0x2626664c3603398794630971918fd21ef5834510";
const MESSAGE = `Mexico 2030 Consensus: 92%. API: ${process.env.RAILWAY_PUBLIC_URL || 'your-railway-url.app'}/docs`;

// Ethers v6 Initialization Fixes
const provider = new ethers.JsonRpcProvider(PROVIDER_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

async function startRainmaker() {
    console.log("[AGENT 007] Scanning Base Network for Uniswap V3 Whales...");

    provider.on("block", async (blockNumber) => {
        // Fetch the block and all transaction data
        const block = await provider.getBlock(blockNumber, true);
        if (!block || !block.prefetchedTransactions) return;
        
        for (const tx of block.prefetchedTransactions) {
            if (tx.to && tx.to.toLowerCase() === UNISWAP_V3_ROUTER.toLowerCase()) {
                const targetWallet = tx.from;
                console.log(`[TARGET ACQUIRED] Uniswap Trader Identified: ${targetWallet}`);
                
                await sendAirdropInvite(targetWallet);
            }
        }
    });
}

async function sendAirdropInvite(target) {
    try {
        // Ethers v6 Data Conversion Fixes
        const hexData = ethers.hexlify(ethers.toUtf8Bytes(MESSAGE));
        
        const tx = await wallet.sendTransaction({
            to: target,
            value: ethers.parseEther("0.00001"), // Dust ETH to trigger notification
            data: hexData,
            gasLimit: 25000 
        });

        console.log(`[AIRDROP SENT] Invite delivered to ${target} | TxHash: ${tx.hash}`);
    } catch (e) {
        console.error("[THROTTLED] Rainmaker hit a snag:", e.message);
    }
}

// Ignite the script
startRainmaker();
