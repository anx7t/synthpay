-- Adds escrow and multi-asset support to the tasks table.
-- Run in Supabase: Dashboard → SQL Editor → New query → paste → Run.

alter table tasks add column if not exists asset text not null default 'XLM';
alter table tasks add column if not exists balance_id text;

-- Allow the new 'escrowed' and 'paying' statuses in the status column comment.
-- Status flow: open → escrowed → assigned → submitted → verified → paying → paid
-- (escrowed means the employer has locked funds in a Stellar claimable balance)
-- (paying is a transient lock used during payment/claim to prevent double-spend)
