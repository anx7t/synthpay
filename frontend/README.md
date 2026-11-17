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

All calls live in `src/lib/api.ts`, and that file is the only place to change if the backend differs.
Responses are normalized, so wrapped payloads (`{ data }`, `{ task }`, `{ tasks }`) and common
field aliases (`_id`, `rewardAmount`, Horizon-style `balances[]`, …) are handled.

Request bodies sent:

| Endpoint                         | Body                                                  |
| -------------------------------- | ----------------------------------------------------- |
| `POST /api/agents/create`        | `{ name, type }`                                      |
| `POST /api/tasks/create`         | `{ title, description, reward, employerPublicKey }`   |
| `PATCH /api/tasks/:id/assign`    | `{ agentPublicKey }`                                  |
| `PATCH /api/tasks/:id/submit`    | `{ submission }`                                      |
| `PATCH /api/tasks/:id/verify`    | `{ approved: true }`                                  |
| `POST /api/payments/release`     | `{ taskId }`                                          |

The backend has no "list agents" endpoint, so the agent roster comes from two places: agents
created in this browser (public key, name and type, kept in `localStorage`) and agent keys that
appear on tasks. Secret keys are never stored.

The backend must allow CORS from `http://localhost:3000`.
