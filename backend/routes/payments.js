const express = require('express');
const router = express.Router();
const { sendPayment, getBalance } = require('../stellar/wallet');
const supabase = require('../db/supabase');

/**
 * Mark a task paid and store the transaction hash. Falls back to updating only
 * the status if the `tx_hash` column hasn't been added yet (see
 * db/migrations/001_add_tx_hash.sql).
 */
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

// POST /api/payments/release
// Body: { senderSecret, receiverPublicKey, amount, taskId? }
//
// With `taskId`, the payment is tied to a task:
//   - the task must be `verified` and assigned to `receiverPublicKey`
//   - `amount` must equal the task's reward
//   - the task is locked (status `paying`) before any money moves, so two
//     concurrent requests can't pay it twice
//   - on success the task becomes `paid` with its `tx_hash`
// Without `taskId` it behaves exactly as before (plain payment).
router.post('/release', async (req, res) => {
  const { senderSecret, receiverPublicKey, amount, taskId } = req.body;
  if (!senderSecret || !receiverPublicKey || !amount) {
    return res.status(400).json({ error: 'senderSecret, receiverPublicKey, amount required' });
  }

  // Plain payment, not linked to a task.
  if (taskId === undefined || taskId === null || taskId === '') {
    try {
      const result = await sendPayment(senderSecret, receiverPublicKey, amount);
      return res.json({ success: true, txHash: result.txHash });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // 1. Load and check the task.
  const { data: task, error: loadError } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', taskId)
    .single();

  if (loadError || !task) return res.status(404).json({ error: 'Task not found' });
  if (task.status === 'paid') return res.status(409).json({ error: 'Task is already paid', task });
  if (task.status !== 'verified') {
    return res.status(409).json({ error: `Task must be verified before payment (current status: ${task.status})` });
  }
  if (task.agent_public_key !== receiverPublicKey) {
    return res.status(400).json({ error: "receiverPublicKey does not match the task's assigned agent" });
  }
  if (Number(task.reward) !== Number(amount)) {
    return res.status(400).json({ error: `amount must equal the task reward (${task.reward})` });
  }

  // 2. Lock it: only one request can move verified -> paying.
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

  // 3. Send the payment; unlock if it fails.
  let result;
  try {
    result = await sendPayment(senderSecret, receiverPublicKey, amount);
  } catch (err) {
    await supabase.from('tasks').update({ status: 'verified' }).eq('id', taskId);
    return res.status(500).json({ error: err.message });
  }

  // 4. Record it. The money has already moved, so report success either way.
  const { data: paidTask, error: paidError } = await markPaid(taskId, result.txHash);
  if (paidError) {
    return res.json({
      success: true,
      txHash: result.txHash,
      warning: `Payment sent, but the task could not be marked paid: ${paidError.message}`,
    });
  }

  res.json({ success: true, txHash: result.txHash, task: paidTask });
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
