const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { generateAgentWallet, fundWallet, getBalance } = require('../stellar/wallet');
const supabase = require('../db/supabase');

// ── Schemas ───────────────────────────────────────────────────────────────────

const createAgentSchema = z.object({
  name: z.string().min(1, 'name is required'),
  agentType: z.string().min(1, 'agentType is required'),
  webhookUrl: z.string().url('webhookUrl must be a valid URL').optional().nullable(),
});

function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    const msg = result.error.errors.map(e => e.message).join(', ');
    return { error: msg };
  }
  return { data: result.data };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/agents/create
// Body: { name, agentType, webhookUrl? }
// webhookUrl — if set, SynthPay will POST task.assigned events to this URL
router.post('/create', async (req, res) => {
  const { error: validErr, data } = validate(createAgentSchema, req.body);
  if (validErr) return res.status(400).json({ error: validErr });

  const { name, agentType, webhookUrl } = data;

  try {
    const wallet = generateAgentWallet();
    await fundWallet(wallet.publicKey);

    const { data: agent, error: dbError } = await supabase
      .from('agents')
      .insert({
        name,
        agent_type: agentType,
        public_key: wallet.publicKey,
        webhook_url: webhookUrl || null,
      })
      .select()
      .single();

    if (dbError) return res.status(500).json({ error: dbError.message });

    res.json({
      success: true,
      agent,
      secretKey: wallet.secretKey, // ⚠️ never persisted; store securely client-side
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
