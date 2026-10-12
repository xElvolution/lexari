/** Settings > Integrations tables (migrations 0013_integrations.sql and 0032_consent_wallets.sql). */
import { bigint, boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const integrationGrants = pgTable("integration_grants", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  connector: text("connector").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  agentSlugs: text("agent_slugs").array().notNull().default([]),
  perTxUsd: integer("per_tx_usd").notNull().default(5),
  dailyUsd: integer("daily_usd").notNull().default(20),
  maxSlippageBps: integer("max_slippage_bps").notNull().default(100),
  /** null: a grant from before consent existed, which keeps every scope of its integration */
  scopes: text("scopes").array(),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  consentedAt: timestamp("consented_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("integration_grants_user_connector").on(t.userId, t.connector)]);

export const integrationActions = pgTable("integration_actions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  connector: text("connector").notNull(),
  tool: text("tool").notNull(),
  agentSlug: text("agent_slug").notNull(),
  chain: text("chain").notNull().default(""),
  convo: text("convo").notNull().default(""),
  messageId: text("message_id").notNull().default(""),
  input: jsonb("input").notNull().default({}),
  preview: jsonb("preview"),
  usdMicros: bigint("usd_micros", { mode: "number" }).notNull().default(0),
  /** done | prepared | rejected | cancelled | expired | submitting | submitted | confirmed | failed */
  status: text("status").notNull(),
  error: text("error"),
  txSig: text("tx_sig").unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  settledAt: timestamp("settled_at", { withTimezone: true }),
});

export const integrationAudit = pgTable("integration_audit", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  connector: text("connector").notNull(),
  /** consent | change | revoke | expire | remove */
  event: text("event").notNull(),
  detail: jsonb("detail").notNull().default({}),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const linkedWallets = pgTable("linked_wallets", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  address: text("address").notNull(),
  family: text("family").notNull(),
  client: text("client").notNull().default(""),
  verifiedAt: timestamp("verified_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.address] }), uniqueIndex("linked_wallets_address").on(t.address)]);

export const walletPrefs = pgTable("wallet_prefs", {
  userId: uuid("user_id").primaryKey().references(() => users.id, { onDelete: "cascade" }),
  activeAddress: text("active_address").notNull(),
  activeChain: text("active_chain").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
