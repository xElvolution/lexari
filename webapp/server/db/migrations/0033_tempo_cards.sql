-- Tempo agent cards. Additive only.
-- One card per agent: it spends the agent's Tempo testnet stablecoins, inside per-payment and daily limits you set.
-- Every card payment is a Confirm card (never auto). Frozen cards can't prepare or execute payments.
create table if not exists tempo_cards (
  user_id uuid not null references users (id) on delete cascade,
  agent_slug text not null,
  per_tx_micros bigint not null default 5000000,
  daily_micros bigint not null default 20000000,
  frozen boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, agent_slug),
  constraint tempo_cards_sane check (per_tx_micros between 0 and 100000000 and daily_micros between 0 and 500000000 and daily_micros >= per_tx_micros)
);
