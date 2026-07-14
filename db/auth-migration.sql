-- Lexari auth: users + sessions. Run once in the Neon SQL editor.

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

-- Link jobs to the user who created them (nullable: agents/anon demos have none).
alter table jobs add column if not exists user_id uuid references users(id) on delete set null;
create index if not exists jobs_user_idx on jobs (user_id);
