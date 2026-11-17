const express = require('express');
const router = express.Router();
const supabase = require('../db/supabase');

// POST /api/tasks/create
router.post('/create', async (req, res) => {
  const { title, description, reward, employerPublicKey, agentPublicKey } = req.body;
  if (!title || !reward || !employerPublicKey) {
    return res.status(400).json({ error: 'title, reward, employerPublicKey required' });
  }

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description,
      reward,
      employer_public_key: employerPublicKey,
      agent_public_key: agentPublicKey || null,
      status: 'open',
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, task: data });
});

// GET /api/tasks
router.get('/', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, tasks: data });
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

// PATCH /api/tasks/:id/assign
router.patch('/:id/assign', async (req, res) => {
  const { agentPublicKey } = req.body;
  if (!agentPublicKey) return res.status(400).json({ error: 'agentPublicKey required' });

  const { data, error } = await supabase
    .from('tasks')
    .update({ agent_public_key: agentPublicKey, status: 'assigned' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Task not found' });
  res.json({ success: true, task: data });
});

// PATCH /api/tasks/:id/submit
router.patch('/:id/submit', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'submitted', proof_url: req.body.proofUrl || null })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Task not found' });
  res.json({ success: true, task: data });
});

// PATCH /api/tasks/:id/verify
router.patch('/:id/verify', async (req, res) => {
  const { data, error } = await supabase
    .from('tasks')
    .update({ status: 'verified' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Task not found' });
  res.json({ success: true, task: data, message: 'Call /api/payments/release to release funds' });
});

module.exports = router;
