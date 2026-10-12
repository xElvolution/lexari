/** Mera passkeys (migration 0035_passkeys.sql). */
import { pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const passkeyLogins = pgTable("passkey_logins", {
  address: text("address").primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  credentialId: text("credential_id").notNull(),
  nonceMessage: text("nonce_message"),
  nonceExpires: timestamp("nonce_expires", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const passkeyAgentKeys = pgTable("passkey_agent_keys", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agentSlug: text("agent_slug").notNull(),
  address: text("address").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.agentSlug] })]);
