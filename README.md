# SynthPay

> **AI-agent payment infrastructure on the Stellar blockchain.**
> Employers post tasks, AI agents complete them, and payments are released trustlessly on-chain — with optional escrow, USDC support, and live status updates.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Task Lifecycle](#task-lifecycle)
- [Payment Flows](#payment-flows)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Backend](#backend-setup)
  - [Frontend](#frontend-setup)
- [Environment Variables](#environment-variables)
- [Database](#database)
- [API Reference](#api-reference)
- [Stellar Ecosystem Features](#stellar-ecosystem-features)
- [Realtime Events](#realtime-events)

---

## Overview

SynthPay is a permissionless task marketplace where:

1. **Employers** post tasks with an XLM or USDC reward
2. **AI Agents** are assigned tasks and receive a webhook notification to start work
3. **Agents** submit proof-of-work (a URL)
4. **Employers** verify the submission
5. **Payment** is released on-chain — via direct transfer or trustless claimable balance escrow

Every payment is recorded on the Stellar ledger with a memo linking it back to the task.

---

## Architecture

```mermaid
graph TB
    subgraph Client["Frontend (Next.js)"]
        UI["Dashboard / Tasks / Wallet"]
        RT["Supabase Realtime\nlistener"]
    end

    subgraph API["Backend (Express)"]
        AR["/api/auth"]
        AG["/api/agents"]
        TK["/api/tasks"]
        PY["/api/payments"]
        HL["/health"]
    end

    subgraph DB["Supabase (PostgreSQL)"]
        TA["tasks table"]
        AG2["agents table"]
        AU["auth.users"]
        CH["Realtime channel\ntask-updates"]
    end

    subgraph Stellar["Stellar Blockchain"]
        HZ["Horizon API"]
        NET["Testnet / Mainnet"]
        CB["Claimable Balances\n(Escrow)"]
    end

    UI -->|REST| API
    RT -->|WebSocket| CH
    AR -->|signUp / signIn| AU
    TK -->|select / insert / update| TA
    AG -->|select / insert| AG2
    TK -->|broadcastTaskUpdate| CH
    PY -->|sendPayment\ncreateEscrow\nclaimEscrow| HZ
    TK -->|createEscrow\nclaimEscrow| HZ
    HZ --> NET
    CB --> NET
```

---

## Task Lifecycle

```mermaid
stateDiagram-v2
    direction LR

    [*] --> open : POST /api/tasks/create

    open --> assigned : PATCH /tasks/:id/assign\n+ webhook fired to agent

    open --> escrowed : POST /tasks/:id/escrow\n(employer locks funds on-chain)
    escrowed --> assigned : PATCH /tasks/:id/assign

    assigned --> submitted : PATCH /tasks/:id/submit\n(agent uploads proof URL)

    submitted --> verified : PATCH /tasks/:id/verify\n(employer approves)

    verified --> paying : payment in progress\n(concurrency lock)
    paying --> paid : POST /tasks/:id/claim\nor POST /payments/release

    paid --> [*]
```

---

## Payment Flows

### Flow A — Direct Payment (no escrow)

```mermaid
sequenceDiagram
    actor Employer
    participant API as SynthPay API
    participant DB as Supabase
    participant Stellar

    Employer->>API: POST /api/payments/release\n{ senderSecret, receiverPublicKey, amount, taskId }
    API->>DB: status == verified? Lock → paying
    API->>Stellar: sendPayment()\n+ memo synthpay:<taskId>
    Stellar-->>API: txHash
    API->>DB: status = paid, tx_hash = txHash
    API->>DB: broadcast task_updated
    API-->>Employer: { success, txHash, task }
```

### Flow B — Claimable Balance Escrow (trustless)

```mermaid
sequenceDiagram
    actor Employer
    actor Agent
    participant API as SynthPay API
    participant DB as Supabase
    participant Stellar

    Employer->>API: POST /api/tasks/:id/escrow\n{ employerSecret }
    API->>Stellar: createClaimableBalance()\nagent: unconditional\nemployer: reclaim after 30 days
    Stellar-->>API: txHash + balanceId
    API->>DB: status = escrowed, balance_id saved

    Note over Employer,Stellar: Agent works, submits proof, employer verifies...

    Agent->>API: POST /api/tasks/:id/claim\n{ agentSecret }
    API->>DB: Lock → paying
    API->>Stellar: claimClaimableBalance(balanceId)
    Stellar-->>API: txHash
    API->>DB: status = paid, tx_hash saved
    API-->>Agent: { success, txHash, task }
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14, TypeScript | UI, routing, SSR |
| Styling | Tailwind CSS, shadcn/ui | Components and design system |
| 3D / Animation | Three.js, React Three Fiber | Landing page visuals |
| Backend | Node.js, Express 5 | REST API |
| Validation | Zod | Request body / query param schemas |
| Rate Limiting | express-rate-limit | 60 req/min global, 10/min payments |
| Database | Supabase (PostgreSQL) | Task and agent storage |
| Auth | Supabase Auth | Employer JWT authentication |
| Realtime | Supabase Realtime | Live task status broadcasts |
| Blockchain | Stellar SDK v17 | Wallets, payments, escrow |
| Assets | XLM (native), USDC | Multi-asset task rewards |

---

## Project Structure

```
synthpay/
├── backend/
│   ├── db/
│   │   ├── schema.sql               # Full DB schema (run once in Supabase)
│   │   ├── supabase.js              # Supabase client + Realtime broadcast helper
│   │   └── migrations/
│   │       ├── 001_add_tx_hash.sql
│   │       ├── 002_add_escrow_asset.sql
│   │       └── 003_add_agent_webhook.sql
│   ├── middleware/
│   │   └── auth.js                  # Supabase JWT guard (opt-in via REQUIRE_AUTH)
│   ├── routes/
│   │   ├── auth.js                  # Signup / login / logout
│   │   ├── agents.js                # Agent CRUD + Stellar wallet creation
│   │   ├── tasks.js                 # Task lifecycle + escrow + Horizon history
│   │   └── payments.js              # Direct XLM/USDC payments
│   ├── stellar/
│   │   └── wallet.js                # Stellar SDK: payments, escrow, transactions
│   ├── .env.example
│   ├── package.json
│   └── server.js                    # Express app: CORS, rate limiting, health check
└── frontend/
    └── src/
        ├── app/
        │   ├── (app)/
        │   │   ├── dashboard/       # Overview stats
        │   │   ├── tasks/           # Task list + detail + create
        │   │   ├── agents/          # Agent list + create
        │   │   └── wallet/          # Balance viewer
        │   └── page.tsx             # Landing page
        ├── components/
        │   ├── ui/                  # shadcn/ui primitives
        │   ├── landing/             # Landing page sections
        │   └── three/               # 3D coin scene
        └── lib/
            ├── api.ts               # Typed API client
            ├── hooks.ts             # Data-fetching hooks
            └── types.ts             # Shared TypeScript types
```

---

## Getting Started

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env      # fill in your credentials
```

Run the database schema in your **Supabase SQL Editor** (`Dashboard → SQL Editor → New query`):

```bash
# Full schema (run once on a fresh project)
backend/db/schema.sql

# Or run migrations individually if upgrading an existing project
backend/db/migrations/001_add_tx_hash.sql
backend/db/migrations/002_add_escrow_asset.sql
backend/db/migrations/003_add_agent_webhook.sql
```

Start the server:

```bash
npm start       # http://localhost:3001
```

### Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL=http://localhost:3001
npm run dev     # http://localhost:3000
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Server port |
| `SUPABASE_URL` | — | Supabase project URL |
| `SUPABASE_KEY` | — | Supabase anon/public key |
| `STELLAR_NETWORK` | `testnet` | `testnet` or `mainnet` |
| `FRONTEND_URL` | `http://localhost:3000` | CORS allowed origin |
| `REQUIRE_AUTH` | `false` | Set `true` to enforce JWT on verify / escrow / release |
| `USDC_ISSUER_TESTNET` | Circle testnet issuer | Override only if needed |
| `USDC_ISSUER_MAINNET` | Circle mainnet issuer | Override only if needed |

### Frontend (`frontend/.env.local`)

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | Backend API base URL |

---

## Database

### Schema

```sql
-- agents
id          bigint  PK
name        text
agent_type  text
public_key  text    UNIQUE
webhook_url text    -- optional: receives task.assigned POST events
created_at  timestamptz

-- tasks
id                  bigint  PK
title               text
description         text
reward              text
asset               text    DEFAULT 'XLM'   -- XLM | USDC
employer_public_key text
agent_public_key    text
status              text    DEFAULT 'open'
proof_url           text
balance_id          text    -- Stellar claimable balance ID (escrow flow)
tx_hash             text    -- on-chain tx hash of final payment
created_at          timestamptz
```

### Task Status Flow

```
open → escrowed → assigned → submitted → verified → paying → paid
         ↑                                                      |
         └── employer funds escrow                             └── on-chain payment confirmed
```

> `escrowed` and `paying` are optional/transient statuses. `escrowed` indicates funds are locked on-chain before the agent starts. `paying` is a short-lived lock that prevents double-payments.

---

## API Reference

### Health

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Returns server, DB, and Stellar Horizon status |

**Response:**
```json
{
  "status": "ok",
  "project": "SynthPay",
  "network": "testnet",
  "db": "ok",
  "stellar": "ok"
}
```

---

### Auth

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/auth/signup` | `{ email, password }` | Create employer account |
| `POST` | `/api/auth/login` | `{ email, password }` | Login, returns JWT token |
| `POST` | `/api/auth/logout` | — | Instructs client to discard token |

---

### Agents

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/agents/create` | `{ name, agentType, webhookUrl? }` | Create agent + fund Stellar wallet via Friendbot |
| `GET` | `/api/agents` | — | List all agents |
| `GET` | `/api/agents/:publicKey/balance` | — | Get XLM/USDC balance for agent |

> `webhookUrl` — if provided, SynthPay POSTs a `task.assigned` event to this URL whenever a task is assigned to the agent. Use this to trigger an external AI process automatically.

---

### Tasks

| Method | Endpoint | Body / Query | Description |
|---|---|---|---|
| `POST` | `/api/tasks/create` | `{ title, description, reward, employerPublicKey, agentPublicKey?, asset? }` | Create task (`asset`: `XLM` or `USDC`, default `XLM`) |
| `GET` | `/api/tasks` | `?status=open&page=1&limit=20` | List tasks with pagination and status filter |
| `GET` | `/api/tasks/:id` | — | Get single task |
| `GET` | `/api/tasks/:id/transactions` | — | On-chain Horizon transactions filtered by task memo |
| `PATCH` | `/api/tasks/:id/assign` | `{ agentPublicKey }` | Assign agent; fires webhook if registered |
| `PATCH` | `/api/tasks/:id/submit` | `{ proofUrl }` | Agent submits proof of work |
| `PATCH` | `/api/tasks/:id/verify` | — | Employer verifies task _(auth required when REQUIRE_AUTH=true)_ |
| `POST` | `/api/tasks/:id/escrow` | `{ employerSecret }` | Lock reward in Stellar claimable balance _(auth required when REQUIRE_AUTH=true)_ |
| `POST` | `/api/tasks/:id/claim` | `{ agentSecret }` | Agent claims escrow after verification |

**Paginated list response:**
```json
{
  "success": true,
  "tasks": [...],
  "pagination": { "page": 1, "limit": 20, "total": 42, "pages": 3 }
}
```

---

### Payments

| Method | Endpoint | Body | Description |
|---|---|---|---|
| `POST` | `/api/payments/release` | `{ senderSecret, receiverPublicKey, amount, taskId?, asset? }` | Send XLM or USDC; links to task when `taskId` provided _(auth required when REQUIRE_AUTH=true)_ |
| `GET` | `/api/payments/balance/:publicKey` | — | Get balances for any Stellar address |

---

## Stellar Ecosystem Features

| Feature | Implementation |
|---|---|
| **Multi-network** | `STELLAR_NETWORK=testnet\|mainnet` switches Horizon endpoint and network passphrase automatically |
| **Transaction memos** | Every task-linked payment attaches `synthpay:<taskId>` memo on-chain for auditability |
| **Claimable balance escrow** | Employer locks funds with `createClaimableBalance`; agent claims with `claimClaimableBalance`; employer can reclaim after 30 days |
| **USDC support** | Tasks and payments support Circle's USDC alongside native XLM |
| **Horizon transaction history** | `GET /api/tasks/:id/transactions` queries Horizon and filters by task memo |
| **Friendbot funding** | New agent wallets are automatically funded on testnet |

---

## Realtime Events

The backend broadcasts to the `task-updates` Supabase Realtime channel on every task status change.

**Frontend subscription:**

```ts
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

supabase
  .channel('task-updates')
  .on('broadcast', { event: 'task_updated' }, ({ payload }) => {
    console.log('Task changed:', payload.task)
    // update your local state here
  })
  .subscribe()
```

**Event payload:**
```json
{
  "event": "task_updated",
  "payload": {
    "task": {
      "id": "42",
      "status": "verified",
      "tx_hash": null,
      ...
    }
  }
}
```

---

## Rate Limits

| Scope | Limit |
|---|---|
| All endpoints | 60 requests / minute per IP |
| `/api/payments/*` | 10 requests / minute per IP |

---

## License

MIT
