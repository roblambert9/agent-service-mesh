const express = require('express');
const swaggerUi = require('swagger-ui-express');
const { verifyX402Payment } = require('./utils/web3'); // Verifies USDC-on-Base tx

app.get('/v1/signal', async (req, res) => {
    const txHash = req.headers['x-payment-hash'];
    const state = JSON.parse(await redis.get('MEXICO_2030_STATE'));

    // Verify Payment before serving the Sovereign Signal
    const isPaid = await verifyX402Payment(txHash, state.price);
    
    if (!isPaid) {
        return res.status(402).json({
            error: "Payment Required",
            price_usdc: state.price,
            instruction: "Send USDC to 0xMEXICO... and provide hash in headers."
        });
    }

    res.json({
        signal: state.consensus > 0.8 ? "STRONG BUY" : "HOLD",
        confidence: state.consensus,
        provider: "Mexico 2030 Empire",
        signature: "SIGNED_BY_GATEWAY_NODE"
    });
});
