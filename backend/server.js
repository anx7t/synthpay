const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const tasksRouter = require('./routes/tasks');
const agentsRouter = require('./routes/agents');
const paymentsRouter = require('./routes/payments');
const authRouter = require('./routes/auth');
const supabase = require('./db/supabase');

const app = express();

// ── CORS ──────────────────────────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ── Rate limiting ─────────────────────────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 60_000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests — please try again in a minute.' },
});

const paymentLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many payment requests — please slow down.' },
});

app.use(globalLimiter);
app.use(express.json());

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/tasks', tasksRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/payments', paymentLimiter, paymentsRouter);
app.use('/api/auth', authRouter);

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', async (_req, res) => {
  const isTestnet = (process.env.STELLAR_NETWORK || 'testnet').toLowerCase() !== 'mainnet';
  const horizonUrl = isTestnet
    ? 'https://horizon-testnet.stellar.org'
    : 'https://horizon.stellar.org';

  const [dbCheck, stellarCheck] = await Promise.allSettled([
    supabase.from('tasks').select('id').limit(1),
    fetch(`${horizonUrl}/`, { signal: AbortSignal.timeout(5000) }),
  ]);

  const dbOk = dbCheck.status === 'fulfilled' && !dbCheck.value?.error;
  const stellarOk = stellarCheck.status === 'fulfilled' && stellarCheck.value?.ok;

  res.status(dbOk && stellarOk ? 200 : 503).json({
    status: dbOk && stellarOk ? 'ok' : 'degraded',
    project: 'SynthPay',
    network: process.env.STELLAR_NETWORK || 'testnet',
    db: dbOk ? 'ok' : 'error',
    stellar: stellarOk ? 'ok' : 'error',
  });
});

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`SynthPay backend running on port ${PORT}`));
