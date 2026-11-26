const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { sendPayment, getBalance } = require('../stellar/wallet');
const supabase = require('../db/supabase');
const { broadcastTaskUpdate } = require('../db/supabase');
const { requireAuth } = require('../middleware/auth');

// ── Schemas ───────────────────────────────────────────────────────────────────

const releaseSchema = z.object({
  senderSecret: z.string().min(1, 'senderSecret is required'),
  receiverPublicKey: z.string().min(1, 'receiverPublicKey is required'),
  amount: z.coerce.number().positive('amount must be a positive number'),
  taskId: z.union([z.string(), z.number()]).optional().nullable(),
  asset: z.enum(['XLM', 'USDC']).default('XLM'),
});

function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: result.error.errors.map(e => e.message).join(', ') };
  }
  return { data: result.data };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function markPaid(taskId, txHash) {
  let { data, error } = await supabase
    .from('tasks')
    .update({ status: 'paid', tx_hash: txHash })
    .eq('id', taskId)
    .select()
    .single();

  if (error && /tx_hash/.test(error.message || '')) {
    ({ data, error } = await supabase
      .from('tasks')
      .update({ status: 'paid' })
      .eq('id', taskId)
      .select()
      .single());
  }
  return { data, error };
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/payments/release — requires auth when REQUIRE_AUTH=true
router.post('/release', requireAuth, async (req, res) => {
  const { error: validErr, data } = validate(releaseSchema, req.body);
  if (validErr) return res.status(400).json({ error: validErr });

  const { senderSecret, receiverPublicKey, amount, taskId, asset } = data;

  // ── Plain payment (no task linked) ──
  if (!taskId) {
    try {
      const result = await sendPayment(senderSecret, receiverPublicKey, amount, { asset });
      return res.json({ success: true, txHash: result.txHash });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── Task-linked payment ──

  const { data: task, error: loadError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (loadError || !task) return res.status(404).json({ error: 'Task not found' });
  if (task.status === 'paid') return res.status(409).json({ error: 'Task is already paid', task });
  if (task.balance_id) {
    return res.status(400).json({
      error: 'This task uses on-chain escrow. Use POST /api/tasks/:id/claim instead.',
    });
  }
  if (task.status !== 'verified') {
    return res.status(409).json({ error: `Task must be verified before payment (current status: ${task.status})` });
  }
  if (task.agent_public_key !== receiverPublicKey) {
    return res.status(400).json({ error: "receiverPublicKey does not match the task's assigned agent" });
  }
  if (Number(task.reward) !== Number(amount)) {
    return res.status(400).json({ error: `amount must equal the task reward (${task.reward})` });
  }

  const { data: locked, error: lockError } = await supabase
    .from('tasks')
    .update({ status: 'paying' })
    .eq('id', taskId)
    .eq('status', 'verified')
    .select();

  if (lockError) return res.status(500).json({ error: lockError.message });
  if (!locked || locked.length === 0) {
    return res.status(409).json({ error: 'Payment for this task is already in progress' });
  }

  let result;
  try {
    result = await sendPayment(senderSecret, receiverPublicKey, amount, {
      taskId,
      asset: task.asset || asset,
    });
  } catch (err) {
    await supabase.from('tasks').update({ status: 'verified' }).eq('id', taskId);
    return res.status(500).json({ error: err.message });
  }

  const { data: paidTask, error: paidError } = await markPaid(taskId, result.txHash);
  if (paidError) {
    return res.json({
      success: true,
      txHash: result.txHash,
      warning: `Payment sent, but the task could not be marked paid: ${paidError.message}`,
    });
  }

  broadcastTaskUpdate(paidTask);
  res.json({ success: true, txHash: result.txHash, task: paidTask });
});

// GET /api/payments/balance/:publicKey
router.get('/balance/:publicKey', async (req, res) => {
  try {
    const balances = await getBalance(req.params.publicKey);
    res.json({ success: true, balances });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
