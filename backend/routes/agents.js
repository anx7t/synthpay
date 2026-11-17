const express = require('express');
const router = express.Router();
const { generateAgentWallet, fundWallet, getBalance } = require('../stellar/wallet');
const supabase = require('../db/supabase');

// POST /api/agents/create
router.post('/create', async (req, res) => {
  const { name, agentType } = req.body;
  if (!name || !agentType) return res.status(400).json({ error: 'name and agentType required' });

  try {
    const wallet = generateAgentWallet();
    await fundWallet(wallet.publicKey);

    const { data, error } = await supabase
      .from('agents')
      .insert({ name, agent_type: agentType, public_key: wallet.publicKey })
      .select()
      .single();

    if (error) return res.status(500).json({ error: error.message });

    res.json({
      success: true,
      agent: data,
      secretKey: wallet.secretKey, // ⚠️ store encrypted in prod, never log or persist
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/agents
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, agents: data });
});

// GET /api/agents/:publicKey/balance
router.get('/:publicKey/balance', async (req, res) => {
  try {
    const balances = await getBalance(req.params.publicKey);
    res.json({ success: true, balances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
