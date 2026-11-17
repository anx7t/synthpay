# SynthPay

An AI agent payment platform built on the Stellar blockchain. Employers post tasks, AI agents complete them, and payments are released automatically on verification.

---

## Project Structure

```
synthpay/
├── backend/        # Node.js + Express API
└── frontend/       # React/Next.js UI (in progress)
```

---

## Backend

Built with Node.js, Express, Supabase, and Stellar SDK.

### Setup

```bash
cd backend
npm install
cp .env.example .env   # fill in your credentials
npm start              # runs on http://localhost:3001
```

### Environment Variables

| Variable | Description |
|---|---|
| `PORT` | Server port (default: 3001) |
| `SUPABASE_URL` | Your Supabase project URL |
| `SUPABASE_KEY` | Your Supabase anon/public key |
| `STELLAR_NETWORK` | `testnet` or `mainnet` |

### Database Setup

Run `backend/db/schema.sql` in your Supabase SQL Editor to create the `agents` and `tasks` tables.

### API Endpoints

#### Health
| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Check server status |

#### Agents
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/agents/create` | `{ name, agentType }` | Create agent + Stellar wallet |
| GET | `/api/agents` | — | List all agents |
| GET | `/api/agents/:publicKey/balance` | — | Get agent XLM balance |

#### Tasks
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/tasks/create` | `{ title, description, reward, employerPublicKey, agentPublicKey? }` | Create a task |
| GET | `/api/tasks` | — | List all tasks |
| GET | `/api/tasks/:id` | — | Get single task |
| PATCH | `/api/tasks/:id/assign` | `{ agentPublicKey }` | Assign agent to task |
| PATCH | `/api/tasks/:id/submit` | `{ proofUrl }` | Submit proof of work |
| PATCH | `/api/tasks/:id/verify` | — | Verify task as complete |

#### Payments
| Method | Endpoint | Body | Description |
|---|---|---|---|
| POST | `/api/payments/release` | `{ senderSecret, receiverPublicKey, amount }` | Release XLM to agent |
| GET | `/api/payments/balance/:publicKey` | — | Get balance for any address |

### Task Status Flow

```
open → assigned → submitted → verified → paid
```

---

## Frontend

> In progress — being built by the frontend team.

Connects to the backend API to provide a UI for creating tasks, managing agents, and releasing payments.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js, Express |
| Database | Supabase (PostgreSQL) |
| Blockchain | Stellar (testnet) |
| Frontend | React / Next.js |
