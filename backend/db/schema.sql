-- Run this in your Supabase project: Dashboard → SQL Editor → New query

create table if not exists agents (
  id          bigint generated always as identity primary key,
  name        text not null,
  agent_type  text not null,
  public_key  text not null unique,
  created_at  timestamptz default now()
);

create table if not exists tasks (
  id                   bigint generated always as identity primary key,
  title                text not null,
  description          text,
  reward               text not null,
  employer_public_key  text not null,
  agent_public_key     text,
  status               text not null default 'open',
  proof_url            text,
  created_at           timestamptz default now()
);
