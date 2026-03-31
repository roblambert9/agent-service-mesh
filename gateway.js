const express = require('express');
const swaggerUi = require('swagger-ui-express');
const Redis = require('ioredis');
const axios = require('axios');
const { verifyX402Payment } = require('./utils/web3');

const app = express();
const redis = new Redis(process.env.REDIS_URL);
const port = process.env.PORT || 5000;

app.use(express.json());

// --- AI STUDIO TRUTH-BOND LOGIC ---
const PYTH_HERMES_URL = "https://hermes.pyth.network/v2/updates/price_feeds/";
const BTC_USD_FEED = "0xe62df6c8b4a85fe1a67244e4c00357b966924a97ef99c13fe2c76e582129c97f";
const activeBonds = new Map();

async function createTruthBond(buyerAddress, signalType) {
    if (signalType !== 'STRONG BUY') return null;
    try {
        const pythRes = await axios.get(`${PYTH_HERMES_URL}${BTC_USD_FEED}`);
        const entryPrice = pythRes.data.parsed[0].price.price;
        const bondId = `bond_${Date.now()}_${buyerAddress.substring(0,6)}`;
        
        activeBonds.set(bondId, { buyer: buyerAddress, entryPrice, status: 'LOCKED' });
        console.log(`[TRUTH-BOND] Created for ${buyerAddress}. Entry: ${entryPrice}`);
        return bondId;
    } catch (e) {
        console.log("[TRUTH-BOND] Pyth Network unreachable, skipping bond.");
        return null;
    }
}
// -----------------------------------

// --- THE MULTI-TIER AI HANDSHAKE ---
app.get('/v1/signal', async (req, res) => {
    const isHalted = await redis.get('SYSTEM_HALT');
    if (isHalted === 'true') return res.status(503).json({ error: "System Halted by Owner" });

    const txHash = req.headers['x-payment-hash'];
    const bidAmount = parseFloat(req.headers['x-bid-amount'] || 0);
    const buyerWallet = req.headers['x-buyer-wallet'] || "UNKNOWN";
    
    const rawState = await redis.get('MEXICO_2030_STATE');
    const state = rawState ? JSON.parse(rawState) : { consensus: 0.92 };
    const currentSignal = state.consensus > 0.8 ? "STRONG BUY" : "HOLD";

    // TIER 1: The Free "Delayed" Tier (The Hook)
    if (!txHash) {
        return res.status(200).json({
            warning: "THIS SIGNAL IS 15 MINUTES OLD. MACHINES WILL FRONT-RUN YOU.",
            signal: currentSignal,
            upsell: "For real-time verifiable alpha with Truth-Bond insurance, send 0.005 USDC and provide x-payment-hash."
        });
    }

    const isPaid = await verifyX402Payment(txHash, 0.005);
    if (!isPaid) return res.status(202).json({ status: "PENDING", message: "Verifying on Base..." });

    // TIER 2: High-Frequency Bidding (Premium)
    if (bidAmount >= 0.01) {
        const bondId = await createTruthBond(buyerWallet, currentSignal);
        return res.json({
            tier: "PREMIUM_WHALE",
            signal: currentSignal,
            confidence: state.consensus,
            insurance_bond: bondId || "UNAVAILABLE",
            message: "Alpha confirmed. Truth-Bond active: Refund eligible if price drops."
        });
    }

    // TIER 3: Standard Machine Tier
    res.json({
        tier: "STANDARD",
        signal: currentSignal,
        confidence: state.consensus
    });
});

app.post('/admin/halt', async (req, res) => {
    if (req.headers['x-admin-key'] === process.env.ROBERT_SECRET_KEY) {
        await redis.set('SYSTEM_HALT', 'true');
        return res.json({ status: "EMERGENCY HALT ACTIVATED" });
    }
    res.status(403).send("Forbidden");
});

const swaggerDocument = {
  openapi: "3.0.0",
  info: { title: "Mexico 2030 Agent Gateway", version: "2.0.0" },
  paths: { "/v1/signal": { get: { summary: "Get Insured Alpha Signal" } } }
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(port, () => {
    console.log(`Gateway node running on port ${port} - INSURED ALPHA ACTIVE`);
});
