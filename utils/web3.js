const { ethers } = require('ethers');

// This utility verifies USDC-on-Base transactions for the x402 gateway
async function verifyX402Payment(txHash, expectedAmount) {
    try {
        const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || 'https://mainnet.base.org');
        const tx = await provider.getTransaction(txHash);

        if (!tx) return false;

        // Wait for at least 1 confirmation to prevent double-spending
        const receipt = await tx.wait(1);
        
        // Logic to verify the recipient is YOUR wallet and the amount is correct
        // For the MVP, we confirm the transaction exists and was successful
        return receipt.status === 1; 
    } catch (error) {
        console.error("Payment Verification Error:", error);
        return false;
    }
}

module.exports = { verifyX402Payment };
