-- Run this in your Supabase project: Dashboard → SQL Editor → New query → Run
-- This is the full schema including all migrations; safe to re-run (uses IF NOT EXISTS / IF NOT EXISTS columns).

create table if not exists agents (
  id          bigint generated always as identity primary key,
  name        text not null,
  agent_type  text not null,
  public_key  text not null unique,
  webhook_url text,                        -- optional: POST task.assigned events here
  created_at  timestamptz default now()
);

create table if not exists tasks (
  id                   bigint generated always as identity primary key,
  title                text not null,
  description          text,
  reward               text not null,
  asset                text not null default 'XLM',  -- XLM | USDC
  employer_public_key  text not null,
  agent_public_key     text,
  status               text not null default 'open', -- open | escrowed | assigned | submitted | verified | paying | paid
  proof_url            text,
  balance_id           text,                         -- Stellar claimable balance ID when escrow is used
  tx_hash              text,                         -- on-chain transaction hash of the final payment
  created_at           timestamptz default now()
);
