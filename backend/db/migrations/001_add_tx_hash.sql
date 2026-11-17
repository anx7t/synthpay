-- Stores the Stellar transaction hash when a task is paid.
-- Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
alter table tasks add column if not exists tx_hash text;
