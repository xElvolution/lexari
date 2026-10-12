"use client";

import { useEffect, useSyncExternalStore } from "react";
import { api } from "./api";
import { onSignOut } from "./walletBridge";
import type { ActionCard, AddedIntegration, AuditRow } from "@/content/integrations";

export type IntegrationsState = { added: AddedIntegration[]; agents: { slug: string; kind: string; name: string }[]; loaded: boolean; error?: string };
type Reply = Omit<IntegrationsState, "loaded" | "error">;

const EMPTY: IntegrationsState = { added: [], agents: [], loaded: false };
let state: IntegrationsState = EMPTY;
let inflight: Promise<void> | null = null;
const subs = new Set<() => void>();
const set = (next: Partial<IntegrationsState>) => { state = { ...state, ...next }; subs.forEach((f) => f()); };
const take = (r: Reply) => set({ ...r, loaded: true, error: undefined });

export function loadIntegrations(force = false) {
  if (inflight && !force) return inflight;
  inflight = api<Reply>("/api/integrations").then(take).catch((e: Error) => set({ loaded: true, error: e.message })).finally(() => { inflight = null; });
  return inflight;
}
export function useIntegrations(): IntegrationsState {
  const s = useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, () => state, () => EMPTY);
  useEffect(() => { if (!state.loaded) void loadIntegrations(); }, []);
  return s;
}

export type GrantInput = { agents?: string[]; enabled?: boolean; perTxUsd?: number; dailyUsd?: number; maxSlippageBps?: number; scopes?: string[]; expiresDays?: number };
export async function addIntegration(connector: string, input: GrantInput) { take(await api<Reply>("/api/integrations", { body: { connector, ...input } })); }
export async function updateIntegration(id: string, input: GrantInput) { take(await api<Reply>(`/api/integrations/${id}`, { method: "PATCH", body: input })); }
/** The kill switch: every integration off and every unconfirmed action cancelled. Returns how many were on. */
export async function revokeAllIntegrations() { const r = await api<Reply & { revoked: number }>("/api/integrations/revoke-all", { body: {} }); take(r); return r.revoked; }
export async function loadAudit(opts: { connector?: string; before?: number } = {}) {
  const q = new URLSearchParams({ limit: "40", ...(opts.connector ? { connector: opts.connector } : {}), ...(opts.before ? { before: String(opts.before) } : {}) });
  return (await api<{ rows: AuditRow[] }>(`/api/integrations/audit?${q}`)).rows;
}
export async function removeIntegration(id: string) { take(await api<Reply>(`/api/integrations/${id}`, { method: "DELETE" })); }

export async function actOn(id: string, op: "confirm" | "cancel") {
  const r = await api<{ action: ActionCard }>(`/api/integrations/actions/${id}`, { body: { op } });
  if (state.loaded) void loadIntegrations(true); // the card's activity row and today's spend
  return r.action;
}
export async function actionNow(id: string) { return (await api<{ action: ActionCard }>(`/api/integrations/actions/${id}`)).action; }

onSignOut("integrations", () => { state = EMPTY; subs.forEach((f) => f()); });
