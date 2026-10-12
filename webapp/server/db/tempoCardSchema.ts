/** Tempo agent cards (migration 0033_tempo_cards.sql). */
import { bigint, boolean, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./schema";

export const tempoCards = pgTable("tempo_cards", {
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  agentSlug: text("agent_slug").notNull(),
  perTxMicros: bigint("per_tx_micros", { mode: "number" }).notNull().default(5_000_000),
  dailyMicros: bigint("daily_micros", { mode: "number" }).notNull().default(20_000_000),
  frozen: boolean("frozen").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [primaryKey({ columns: [t.userId, t.agentSlug] })]);
