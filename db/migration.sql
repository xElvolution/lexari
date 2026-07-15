-- RenderReel schema for Neon Postgres. Run once in the Neon SQL editor.

create extension if not exists "pgcrypto";

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  template text not null check (template in ('launch-reel', 'stat-clip', 'app-tour')),
  status text not null default 'queued'
    check (status in ('queued', 'rendering', 'done', 'failed')),
  input jsonb not null,
  input_hash text not null,
  payment jsonb,
  progress int not null default 0,
  output_path text,
  output_hash text,
  receipt_path text,
  error text,
  demo boolean not null default false,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists jobs_claim_idx on jobs (status, demo, created_at);

create table if not exists demo_requests (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

create index if not exists demo_requests_ip_idx on demo_requests (ip, created_at);

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text not null,
  name text,
  created_at timestamptz not null default now()
);

create table if not exists sessions (
  token text primary key,
  user_id uuid not null references users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create index if not exists sessions_user_idx on sessions (user_id);

-- Link renders to accounts (nullable: agent/x402 and demo jobs have no user).
alter table jobs add column if not exists user_id uuid references users(id) on delete set null;
create index if not exists jobs_user_idx on jobs (user_id, created_at desc);
