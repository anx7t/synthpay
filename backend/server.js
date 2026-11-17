const express = require('express');
const cors = require('cors');
require('dotenv').config();

const tasksRouter = require('./routes/tasks');
const agentsRouter = require('./routes/agents');
const paymentsRouter = require('./routes/payments');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/tasks', tasksRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/payments', paymentsRouter);

app.get('/health', (req, res) => res.json({ status: 'ok', project: 'SynthPay' }));

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`SynthPay backend running on port ${PORT}`));
