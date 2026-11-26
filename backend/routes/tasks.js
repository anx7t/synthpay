const express = require('express');
const router = express.Router();
const { z } = require('zod');
const supabase = require('../db/supabase');
const { broadcastTaskUpdate } = require('../db/supabase');
const { createEscrow, claimEscrow, getTransactions } = require('../stellar/wallet');
const { requireAuth } = require('../middleware/auth');

// ── Schemas ───────────────────────────────────────────────────────────────────

const assetEnum = z.enum(['XLM', 'USDC']).default('XLM');

const createTaskSchema = z.object({
  title: z.string().min(1, 'title is required'),
  description: z.string().optional().default(''),
  reward: z.coerce.number().positive('reward must be a positive number'),
  employerPublicKey: z.string().min(1, 'employerPublicKey is required'),
  agentPublicKey: z.string().optional(),
  asset: assetEnum,
});

const assignSchema = z.object({
  agentPublicKey: z.string().min(1, 'agentPublicKey is required'),
});

const submitSchema = z.object({
  proofUrl: z.string().url('proofUrl must be a valid URL').optional().nullable(),
});

const escrowSchema = z.object({
  employerSecret: z.string().min(1, 'employerSecret is required'),
});

const claimSchema = z.object({
  agentSecret: z.string().min(1, 'agentSecret is required'),
});

const listQuerySchema = z.object({
  status: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: result.error.errors.map(e => e.message).join(', ') };
  }
  return { data: result.data };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function notifyAgent(webhookUrl, task) {
  if (!webhookUrl) return;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 5000);
    await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'task.assigned', task }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
  } catch {
    // Webhook failures are non-fatal
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// POST /api/tasks/create
router.post('/create', async (req, res) => {
  const { error, data } = validate(createTaskSchema, req.body);
  if (error) return res.status(400).json({ error });

  const { title, description, reward, employerPublicKey, agentPublicKey, asset } = data;

  const { data: task, error: dbError } = await supabase
    .from('tasks')
    .insert({
      title,
      description,
      reward: String(reward),
      employer_public_key: employerPublicKey,
      agent_public_key: agentPublicKey || null,
      asset,
      status: 'open',
    })
    .select()
    .single();

  if (dbError) return res.status(500).json({ error: dbError.message });

  broadcastTaskUpdate(task);
  res.json({ success: true, task });
});

// GET /api/tasks?status=open&page=1&limit=20
router.get('/', async (req, res) => {
  const parsed = listQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json({ error: 'Invalid query params' });

  const { status, page, limit } = parsed.data;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase.from('tasks').select('*', { count: 'exact' });
  if (status) query = query.eq('status', status);
  query = query.order('created_at', { ascending: false }).range(from, to);

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });

  res.json({
    success: true,
    tasks: data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      pages: Math.ceil((count ?? 0) / limit),
    },
  });
});

// GET /api/tasks/:id
router.get('/:id', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Task not found' });
  res.json({ success: true, task: data });
});

// GET /api/tasks/:id/transactions — on-chain payment trail via Stellar Horizon
router.get('/:id/transactions', async (req, res) => {
  const { data: task, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error || !task) return res.status(404).json({ error: 'Task not found' });

  const publicKey = task.agent_public_key || task.employer_public_key;
  if (!publicKey) return res.status(400).json({ error: 'Task has no associated Stellar account' });

  try {
    const memo = `synthpay:${req.params.id}`.slice(0, 28);
    const transactions = await getTransactions(publicKey, memo);
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/tasks/:id/assign
router.patch('/:id/assign', async (req, res) => {
  const { error: validErr, data } = validate(assignSchema, req.body);
  if (validErr) return res.status(400).json({ error: validErr });

  const { agentPublicKey } = data;

  const { data: task, error: dbError } = await supabase
    .from('tasks')
    .update({ agent_public_key: agentPublicKey, status: 'assigned' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (dbError) return res.status(500).json({ error: dbError.message });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { data: agent } = await supabase
    .from('agents')
    .select('webhook_url')
    .eq('public_key', agentPublicKey)
    .single();

  await notifyAgent(agent?.webhook_url, task);
  broadcastTaskUpdate(task);

  res.json({ success: true, task });
});

// PATCH /api/tasks/:id/submit
router.patch('/:id/submit', async (req, res) => {
  const { error: validErr, data } = validate(submitSchema, req.body);
  if (validErr) return res.status(400).json({ error: validErr });

  const { data: task, error: dbError } = await supabase
    .from('tasks')
    .update({ status: 'submitted', proof_url: data.proofUrl ?? null })
    .eq('id', req.params.id)
    .select()
    .single();

  if (dbError) return res.status(500).json({ error: dbError.message });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  broadcastTaskUpdate(task);
  res.json({ success: true, task });
});

// PATCH /api/tasks/:id/verify — requires auth when REQUIRE_AUTH=true
router.patch('/:id/verify', requireAuth, async (req, res) => {
  const { data: task, error: dbError } = await supabase
    .from('tasks')
    .update({ status: 'verified' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (dbError) return res.status(500).json({ error: dbError.message });
  if (!task) return res.status(404).json({ error: 'Task not found' });

  broadcastTaskUpdate(task);

  const nextStep = task.balance_id
    ? 'Task has an escrow — call POST /api/tasks/:id/claim with the agent secret to release funds'
    : 'Call POST /api/payments/release to release funds';

  res.json({ success: true, task, message: nextStep });
});

// POST /api/tasks/:id/escrow — requires auth when REQUIRE_AUTH=true
router.post('/:id/escrow', requireAuth, async (req, res) => {
  const { error: validErr, data } = validate(escrowSchema, req.body);
  if (validErr) return res.status(400).json({ error: validErr });

  const { data: task, error: loadErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (loadErr || !task) return res.status(404).json({ error: 'Task not found' });
  if (!task.agent_public_key) {
    return res.status(400).json({ error: 'Assign an agent to the task before funding escrow' });
  }
  if (task.balance_id) {
    return res.status(409).json({ error: 'Escrow already funded for this task', balanceId: task.balance_id });
  }
  if (!['open', 'assigned'].includes(task.status)) {
    return res.status(409).json({ error: `Cannot fund escrow on a task with status: ${task.status}` });
  }

  try {
    const { txHash, balanceId } = await createEscrow(
      data.employerSecret,
      task.agent_public_key,
      task.reward,
      task.id,
      task.asset || 'XLM'
    );

    if (!balanceId) {
      return res.status(500).json({ error: 'Escrow transaction submitted but balance ID could not be determined', txHash });
    }

    const { data: updated, error: updateErr } = await supabase
      .from('tasks')
      .update({ status: 'escrowed', balance_id: balanceId, tx_hash: txHash })
      .eq('id', task.id)
      .select()
      .single();

    if (updateErr) {
      return res.json({ success: true, txHash, balanceId, warning: `Escrow funded on-chain, but task status update failed: ${updateErr.message}` });
    }

    broadcastTaskUpdate(updated);
    res.json({ success: true, txHash, balanceId, task: updated });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/tasks/:id/claim
router.post('/:id/claim', async (req, res) => {
  const { error: validErr, data } = validate(claimSchema, req.body);
  if (validErr) return res.status(400).json({ error: validErr });

  const { data: task, error: loadErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (loadErr || !task) return res.status(404).json({ error: 'Task not found' });
  if (task.status === 'paid') return res.status(409).json({ error: 'Task is already paid', task });
  if (task.status !== 'verified') {
    return res.status(409).json({ error: `Task must be verified before claiming (current status: ${task.status})` });
  }
  if (!task.balance_id) {
    return res.status(400).json({ error: 'No escrow balance found for this task. Use POST /api/payments/release instead.' });
  }

  const { data: locked, error: lockErr } = await supabase
    .from('tasks')
    .update({ status: 'paying' })
    .eq('id', task.id)
    .eq('status', 'verified')
    .select();

  if (lockErr) return res.status(500).json({ error: lockErr.message });
  if (!locked || locked.length === 0) {
    return res.status(409).json({ error: 'Claim already in progress for this task' });
  }

  try {
    const { txHash } = await claimEscrow(data.agentSecret, task.balance_id);

    const { data: paid, error: paidErr } = await supabase
      .from('tasks')
      .update({ status: 'paid', tx_hash: txHash })
      .eq('id', task.id)
      .select()
      .single();

    if (paidErr) {
      return res.json({ success: true, txHash, warning: `Escrow claimed on-chain, but task status update failed: ${paidErr.message}` });
    }

    broadcastTaskUpdate(paid);
    res.json({ success: true, txHash, task: paid });
  } catch (err) {
    await supabase.from('tasks').update({ status: 'verified' }).eq('id', task.id);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
