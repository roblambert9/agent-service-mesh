const { ethers } = require('ethers');
const admin = require('firebase-admin');
const axios = require('axios');

// 1. INITIALIZE INFRASTRUCTURE
// Note: Ensure your firebase-service-account.json is in your repo root!
const serviceAccount = require('./firebase-service-account.json');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: process.env.FIREBASE_DATABASE_URL 
    });
}

const db = admin.database();
const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL);
const wallet = new ethers.Wallet(process.env.WALLET_PRIVATE_KEY, provider);

const USDC_ABI = ["function transfer(address to, uint256 amount) returns (bool)"];
const USDC_ADDRESS = process.env.USDC_BASE_ADDRESS || "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const usdcContract = new ethers.Contract(USDC_ADDRESS, USDC_ABI, wallet);

const PYTH_BTC_FEED = "https://hermes.pyth.network/v2/updates/price_feeds/0xe62df6c8b4a85fe1a67244e4c00357b966924a97ef99c13fe2c76e582129c97f";

async function runValidationCycle() {
    console.log("--- [AGENT 00] STARTING VALIDATION CYCLE ---");

    try {
        const pythRes = await axios.get(PYTH_BTC_FEED);
        const currentPrice = BigInt(pythRes.data.parsed[0].price.price);
        
        const oneHourAgo = Date.now() - 3600000;
        const signalsRef = db.ref('signals');
        
        // Fetch signals that are mature (1hr old) and still LOCKED
        const snapshot = await signalsRef.orderByChild('timestamp').endAt(oneHourAgo).once('value');
        
        if (!snapshot.exists()) {
            console.log("No mature signals requiring validation.");
            return;
        }

        const signals = snapshot.val();
        for (const id in signals) {
            const sig = signals[id];
            if (sig.status !== 'LOCKED') continue;

            // SLASHING LOGIC: If price dropped on a Strong Buy
            if (sig.type === 'STRONG BUY' && currentPrice < BigInt(sig.entryPrice)) {
                console.warn(`[SLASHING] Failure detected for ${sig.buyer}. Refunding...`);
                
                const amount = ethers.parseUnits("0.01", 6); // 0.01 USDC Refund
                const tx = await usdcContract.transfer(sig.buyer, amount);
                await tx.wait();

                await signalsRef.child(id).update({
                    status: 'SLASHED',
                    exitPrice: currentPrice.toString(),
                    payoutTx: tx.hash
                });
            } else {
                console.log(`[VERIFIED] Signal ${id} was accurate.`);
                await signalsRef.child(id).update({
                    status: 'VERIFIED',
                    exitPrice: currentPrice.toString()
                });
            }
        }
    } catch (err) {
        console.error("[VALIDATOR ERROR]:", err.message);
    }
}

// Run every 60 minutes
setInterval(runValidationCycle, 3600000);
runValidationCycle();
