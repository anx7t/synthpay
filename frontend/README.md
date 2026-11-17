# SynthPay — Frontend

Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui, with React Query and Axios.

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL defaults to http://localhost:3001
npm install
npm run dev                  # http://localhost:3000
```

## Routes

| Route            | What it does                                                                 |
| ---------------- | ---------------------------------------------------------------------------- |
| `/`              | Landing / hero                                                               |
| `/dashboard`     | Stats, task pipeline, recent tasks table, agents with live balances          |
| `/tasks`         | Filterable task board (`?status=open…paid`) with lifecycle actions           |
| `/tasks/create`  | `POST /api/tasks/create` with live preview                                   |
| `/agents`        | Agent roster, live balances (`GET /api/agents/:pk/balance`)                  |
| `/agents/create` | `POST /api/agents/create`, one-time secret key reveal + keypair download     |
| `/wallet`        | Any account lookup via `GET /api/payments/balance/:pk`                       |

## API contract

All calls live in `src/lib/api.ts` and follow the backend reference exactly:

| Method | Endpoint                           | Body                                                                | Used on                         |
| ------ | ---------------------------------- | ------------------------------------------------------------------- | ------------------------------- |
| GET    | `/health`                          | —                                                                   | API status indicator            |
| POST   | `/api/agents/create`               | `{ name, agentType }`                                               | `/agents/create`                |
| GET    | `/api/agents`                      | —                                                                   | `/agents`, dashboard, pickers   |
| GET    | `/api/agents/:publicKey/balance`   | —                                                                   | Agent cards                     |
| POST   | `/api/tasks/create`                | `{ title, description, reward, employerPublicKey, agentPublicKey? }` | `/tasks/create`                 |
| GET    | `/api/tasks`                       | —                                                                   | `/tasks`, dashboard             |
| GET    | `/api/tasks/:id`                   | —                                                                   | `/tasks/[id]`                   |
| PATCH  | `/api/tasks/:id/assign`            | `{ agentPublicKey }`                                                | Assign dialog                   |
| PATCH  | `/api/tasks/:id/submit`            | `{ proofUrl }`                                                      | Submit-proof dialog             |
| PATCH  | `/api/tasks/:id/verify`            | —                                                                   | Verify button (shows `message`) |
| POST   | `/api/payments/release`            | `{ senderSecret, receiverPublicKey, amount }`                       | Release dialog                  |
| GET    | `/api/payments/balance/:publicKey` | —                                                                   | `/wallet`                       |

Responses shaped `{ success: false, error }` are treated as errors even on a 2xx.

**Releasing payment.** The release dialog asks for the employer's secret key, sends it once
with `receiverPublicKey = task.agentPublicKey` and `amount = String(task.reward)`, and never
stores it. Because the release endpoint takes no task id, the API can't mark the task paid;
the browser records `taskId → txHash` locally so the task shows as paid (labelled "local")
and can't be paid twice from that browser.

The backend must allow CORS from `http://localhost:3000`.
