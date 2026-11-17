const express = require('express');
const router = express.Router();
const { sendPayment, getBalance } = require('../stellar/wallet');

// POST /api/payments/release
// Frontend sends: { senderSecret, receiverPublicKey, amount }
// Called after task is verified — releases USDC/XLM to agent
router.post('/release', async (req, res) => {
  try {
    const { senderSecret, receiverPublicKey, amount } = req.body;
    if (!senderSecret || !receiverPublicKey || !amount) {
      return res.status(400).json({ error: 'senderSecret, receiverPublicKey, amount required' });
    }

    const result = await sendPayment(senderSecret, receiverPublicKey, amount);
    res.json({ success: true, txHash: result.txHash });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payments/balance/:publicKey
// Frontend: show wallet balance for any address
router.get('/balance/:publicKey', async (req, res) => {
  try {
    const balances = await getBalance(req.params.publicKey);
    res.json({ success: true, balances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
