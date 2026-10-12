-- MetaMask delegations (ERC-7710) from your MetaMask smart account to an agent. Additive only.
-- The signed delegation carries its own caveats (a MON spending cap and an expiry); the DelegationManager enforces them
-- on chain. Lexari also keeps a running total and refuses anything over the cap or after revoke.
create table if not exists agent_delegations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  agent_slug text not null,
  chain_id integer not null,
  owner text not null,
  delegator text not null,
  delegate text not null,
  delegation jsonb not null,
  max_wei text not null,
  spent_wei text not null default '0',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists agent_delegations_user_agent on agent_delegations (user_id, agent_slug);
