const express = require('express');
const swaggerUi = require('swagger-ui-express');
const Redis = require('ioredis');
const { verifyX402Payment } = require('./utils/web3');

const app = express(); // <--- THIS LINE WAS MISSING
const redis = new Redis(process.env.REDIS_URL);
const port = process.env.PORT || 5000;

app.use(express.json());

// 1. The Sovereign Signal Endpoint
app.get('/v1/signal', async (req, res) => {
    // Check for Global Halt
    const isHalted = await redis.get('SYSTEM_HALT');
    if (isHalted === 'true') return res.status(503).json({ error: "System Halted" });

    const txHash = req.headers['x-payment-hash'];
    const rawState = await redis.get('MEXICO_2030_STATE');
    const state = rawState ? JSON.parse(rawState) : { price: 0.005, consensus: 0.5 };

    if (!txHash) {
        return res.status(402).json({
            error: "Payment Required",
            price_usdc: state.price,
            instruction: "Send USDC to " + (process.env.REVENUE_WALLET_ADDRESS || "0xADDRESS")
        });
    }

    const isPaid = await verifyX402Payment(txHash, state.price);
    
    if (!isPaid) {
        return res.status(202).json({ status: "PENDING", message: "Verifying transaction on Base..." });
    }

    res.json({
        signal: state.consensus > 0.8 ? "STRONG BUY" : "HOLD",
        confidence: state.consensus,
        provider: "Mexico 2030 Empire",
        timestamp: Date.now()
    });
});

// 2. The Kill Switch
app.post('/admin/halt', async (req, res) => {
    if (req.headers['x-admin-key'] === process.env.ROBERT_SECRET_KEY) {
        await redis.set('SYSTEM_HALT', 'true');
        return res.json({ status: "EMERGENCY HALT ACTIVATED" });
    }
    res.status(403).send("Forbidden");
});

// 3. Swagger Docs Setup
const swaggerDocument = {
  openapi: "3.0.0",
  info: { title: "Mexico 2030 Agent Gateway", version: "1.0.0" },
  paths: { "/v1/signal": { get: { summary: "Get High-Confidence Signal" } } }
};
app.use('/docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.listen(port, () => {
    console.log(`Gateway node running on port ${port}`);
});
