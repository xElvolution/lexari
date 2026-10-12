/** MetaMask delegations to agents (migration 0034_agent_delegations.sql). */
import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const agentDelegations = pgTable("agent_delegations", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agentSlug: text("agent_slug").notNull(),
  chainId: integer("chain_id").notNull(),
  owner: text("owner").notNull(),
  delegator: text("delegator").notNull(),
  delegate: text("delegate").notNull(),
  delegation: jsonb("delegation").notNull(),
  maxWei: text("max_wei").notNull(),
  spentWei: text("spent_wei").notNull().default("0"),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
