-- Adds an optional webhook URL to agents.
-- When a task is assigned to an agent, SynthPay POSTs a task.assigned event
-- to this URL so an external AI process can pick up the work automatically.
-- Run in Supabase: Dashboard → SQL Editor → New query → paste → Run.

alter table agents add column if not exists webhook_url text;
