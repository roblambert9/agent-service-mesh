const Redis = require('ioredis');
const redis = new Redis(process.env.REDIS_URL);
const axios = require('axios');

async function updateGlobalState() {
    // 1. Aggregation Logic
    const railwayApis = [/* 11 API Endpoints */];
    const results = await Promise.allSettled(railwayApis.map(url => axios.get(url)));
    const validScores = results.filter(r => r.status === 'fulfilled').map(r => r.value.data.score);
    const consensus = validScores.reduce((a, b) => a + b, 0) / validScores.length;

    // 2. Surge Pricing Logic (Whale Monitor)
    const volatility = await axios.get('AGENT_4E_VOLATILITY_URL'); 
    const isVolatile = volatility.data.index > 0.7;
    const basePrice = 0.005;
    const currentPrice = isVolatile ? basePrice * 2 : basePrice;

    // 3. Update Cache
    const state = {
        consensus,
        timestamp: Date.now(),
        price: currentPrice,
        status: isVolatile ? "SURGE_ACTIVE" : "NORMAL"
    };

    await redis.set('MEXICO_2030_STATE', JSON.stringify(state));
    console.log("State Updated:", state);
}

setInterval(updateGlobalState, 60000); // 60s Heartbeat
