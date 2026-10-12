-- Mera passkeys: one passkey signs you in and derives a separate key for each agent. Additive only.
-- Nothing secret is stored: keys are re-derived from the passkey (WebAuthn PRF) in the browser every time.
create table if not exists passkey_logins (
  address text primary key,
  user_id uuid not null references users (id) on delete cascade,
  credential_id text not null,
  nonce_message text,
  nonce_expires timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists passkey_logins_user on passkey_logins (user_id);
create table if not exists passkey_agent_keys (
  user_id uuid not null references users (id) on delete cascade,
  agent_slug text not null,
  address text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, agent_slug)
);
