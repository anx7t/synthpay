const express = require('express');
const router = express.Router();
const { z } = require('zod');
const supabase = require('../db/supabase');

const credSchema = z.object({
  email: z.string().email('valid email required'),
  password: z.string().min(6, 'password must be at least 6 characters'),
});

function validate(schema, body) {
  const result = schema.safeParse(body);
  if (!result.success) {
    return { error: result.error.errors.map(e => e.message).join(', ') };
  }
  return { data: result.data };
}

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { error: validErr, data } = validate(credSchema, req.body);
  if (validErr) return res.status(400).json({ error: validErr });

  const { data: auth, error } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  });

  if (error) return res.status(400).json({ error: error.message });

  res.status(201).json({
    success: true,
    user: { id: auth.user?.id, email: auth.user?.email },
    token: auth.session?.access_token ?? null,
  });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { error: validErr, data } = validate(credSchema, req.body);
  if (validErr) return res.status(400).json({ error: validErr });

  const { data: auth, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  });

  if (error) return res.status(401).json({ error: error.message });

  res.json({
    success: true,
    user: { id: auth.user?.id, email: auth.user?.email },
    token: auth.session?.access_token,
  });
});

// POST /api/auth/logout
// Server cannot invalidate anon-key JWTs — instructs the client to discard the token.
router.post('/logout', (_req, res) => {
  res.json({ success: true, message: 'Logged out. Discard your token on the client.' });
});

module.exports = router;
