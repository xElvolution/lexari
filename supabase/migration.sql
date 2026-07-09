-- RenderReel jobs schema. Run once in the Supabase SQL editor.

create extension if not exists "pgcrypto";

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  template text not null check (template in ('launch-reel', 'stat-clip')),
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

-- Atomic claim: paid jobs before demo jobs, oldest first.
create or replace function claim_next_job()
returns setof jobs
language plpgsql
security definer
as $$
begin
  return query
  update jobs
  set status = 'rendering', started_at = now()
  where id = (
    select id from jobs
    where status = 'queued'
    order by demo asc, created_at asc
    limit 1
    for update skip locked
  )
  returning *;
end;
$$;

-- Storage buckets (private; MP4s + receipts served via signed URLs):
-- Dashboard -> Storage -> create buckets: "renders" and "receipts", both private.
