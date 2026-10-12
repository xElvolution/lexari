-- Integration consent (scopes and expiry on each grant), the integration audit log, and linked wallets.
alter table integration_grants add column if not exists scopes text[];
alter table integration_grants add column if not exists expires_at timestamptz;
alter table integration_grants add column if not exists consented_at timestamptz;

create table if not exists integration_audit (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  connector text not null,
  event text not null,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists integration_audit_user_at on integration_audit (user_id, created_at desc);

-- Wallets you linked through Privy (verified on the server from a Privy token). One Lexari account per wallet.
create table if not exists linked_wallets (
  user_id uuid not null references users (id) on delete cascade,
  address text not null,
  family text not null check (family in ('solana', 'evm')),
  client text not null default '',
  verified_at timestamptz not null default now(),
  primary key (user_id, address)
);
create unique index if not exists linked_wallets_address on linked_wallets (address);

-- The wallet and chain you picked as active.
create table if not exists wallet_prefs (
  user_id uuid primary key references users (id) on delete cascade,
  active_address text not null,
  active_chain text not null,
  updated_at timestamptz not null default now()
);
