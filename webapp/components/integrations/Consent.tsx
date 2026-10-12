"use client";

import { useEffect, useState } from "react";
import { DEFAULT_EXPIRY_DAYS, EXPIRY_DAYS, SCOPE_INFO, defaultScopes, integrationById, scopesOf, type AuditRow, type IntegrationInfo, type Scope } from "@/content/integrations";
import { addIntegration, loadAudit, updateIntegration, type IntegrationsState } from "@/lib/integrations";
import { friendly } from "@/lib/api";
import { toast, useApp } from "@/lib/store";
import { AgentTile } from "../faces";
import Icon from "../Icon";
import { IntegrationLogo } from "./Logos";
import { IntSheet, IntToggle } from "./Sheets";

export type ConsentDraft = { agents: string[]; perTxUsd: number; dailyUsd: number; maxSlippageBps: number; scopes?: Scope[] };

const SCOPE_ICON: Record<Scope, "eye" | "flip" | "spark" | "wallet" | "send"> = { read: "eye", trade: "flip", bet: "spark", withdraw: "wallet", transfer: "send" };
const pct = (bps: number) => `${(bps / 100).toFixed(bps % 100 ? 1 : 0)}%`;
const until = (days: number) => new Date(Date.now() + days * 86_400_000).toLocaleDateString([], { month: "short", day: "numeric", year: days > 300 ? "numeric" : undefined });
export const expiryLabel = (d: number) => (d === 1 ? "1 day" : `${d} days`);

/**
 * The consent popup: switching an integration on (or adding it) always passes through here. It says what agents may do
 * (each scope in plain words), the limits, which agents get it and for how long. Allowing writes all of that to the
 * grant; the server checks it again on every call.
 */
export function ConsentSheet({ info, grantId, draft, st, onBack, onClose, onDone }: {
  info: IntegrationInfo; grantId?: string; draft: ConsentDraft; st: IntegrationsState; onBack?: () => void; onClose: () => void; onDone: (id: string) => void;
}) {
  const app = useApp();
  const all = scopesOf(info.id);
  const [scopes, setScopes] = useState<Scope[]>(draft.scopes?.length ? ["read", ...draft.scopes.filter((x) => x !== "read")] : defaultScopes(info.id));
  const [days, setDays] = useState<number>(DEFAULT_EXPIRY_DAYS);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const flip = (s: Scope, on: boolean) => setScopes((a) => (on ? [...new Set([...a, s])] : a.filter((x) => x !== s)));
  const nameOf = (slug: string) => st.agents.find((a) => a.slug === slug)?.name || "An agent";
  const allow = async () => {
    setErr(""); setBusy(true);
    const body = { agents: draft.agents, scopes, expiresDays: days, ...(info.moves ? { perTxUsd: draft.perTxUsd, dailyUsd: draft.dailyUsd, ...(info.category === "trading" ? { maxSlippageBps: draft.maxSlippageBps } : {}) } : {}) };
    try {
      if (grantId) await updateIntegration(grantId, body); else await addIntegration(info.id, body);
      toast({ text: `${info.name} is on until ${until(days)}` });
      onDone(info.id);
    } catch (e) { setErr(friendly(e, "That didn't save. Try again.")); setBusy(false); }
  };
  return (
    <IntSheet label={`Allow ${info.name}`} onClose={onClose} head={
      <div data-consent={info.id} className="relative overflow-hidden px-5 pb-4 pt-3 sm:px-6 sm:pt-6 max-[430px]:px-4">
        <div aria-hidden className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-grape/15 blur-2xl" />
        <div className="relative flex items-start gap-3">
          {onBack && <button onClick={onBack} aria-label="Back" className="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/70 hover:bg-tint"><Icon name="back" size={19} /></button>}
          <span className="relative shrink-0">
            <IntegrationLogo id={info.id} size={52} className="pop" />
            <span className="consent-shield absolute -bottom-1.5 -right-1.5 grid h-6 w-6 place-items-center rounded-full bg-grape text-white ring-[3px] ring-[var(--card,#fff)]"><Icon name="lock" size={12} stroke={2.4} /></span>
          </span>
          <div className="min-w-0 flex-1">
            <div className="label text-[9px] text-ink/45">Review access</div>
            <h2 className="display text-[24px] leading-[1.05] text-ink max-[430px]:text-[21px]">Allow {info.name}?</h2>
            <div className="mt-1.5 flex flex-wrap gap-1">{info.chains.map((c) => <span key={c} className="rounded-md bg-tint px-1.5 py-0.5 text-[10.5px] font-semibold text-ink/55">{c}</span>)}</div>
          </div>
          <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/70 hover:bg-tint"><Icon name="x" size={19} /></button>
        </div>
      </div>
    } footer={
      <>
        {err && <p role="alert" data-consent-error className="mb-2.5 text-[13px] text-[#e5484d]">{err}</p>}
        <button data-consent-allow onClick={() => void allow()} disabled={busy || !draft.agents.length} className="btn btn-brand w-full disabled:opacity-50">
          {!busy && <Icon name="check" size={17} stroke={2.4} />}{busy ? "Allowing…" : !draft.agents.length ? "Pick at least one agent" : `Allow for ${expiryLabel(days)}`}
        </button>
        <button data-consent-cancel onClick={onClose} disabled={busy} className="mt-1.5 h-10 w-full rounded-full text-[14px] font-semibold text-ink/60 hover:text-ink">Not now</button>
      </>
    }>
      <h3 className="label text-[9px] text-ink/45">What agents can do</h3>
      <ul data-consent-scopes className="mt-1 divide-y divide-[var(--line)]">
        {all.map((s, i) => {
          const on = scopes.includes(s), info2 = SCOPE_INFO[s], locked = s === "read";
          return (
            <li key={s} data-scope={s} data-on={on ? "1" : "0"} className="row-in flex items-start gap-3 py-3" style={{ animationDelay: `${i * 55}ms` }}>
              <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-[12px] transition ${on ? (info2.risky ? "bg-[#fff1e6] text-[#c2570c]" : "bg-grape/12 text-brand-ink") : "bg-tint text-ink/35"}`}><Icon name={SCOPE_ICON[s]} size={17} /></span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 text-[14.5px] font-semibold text-ink">{info2.title}{info2.risky && <span className="rounded-full bg-[#fff1e6] px-1.5 py-0.5 text-[10px] font-bold text-[#c2570c]">Higher risk</span>}</div>
                <div className="text-[12.5px] leading-snug text-ink/55">{info2.body}</div>
              </div>
              {locked ? <span className="mt-1 shrink-0 rounded-full bg-tint px-2 py-1 text-[11px] font-bold text-ink/50">Always</span>
                : <span className="mt-0.5"><IntToggle on={on} onChange={(v) => flip(s, v)} label={`${on ? "Don't allow" : "Allow"}: ${info2.title}`} /></span>}
            </li>
          );
        })}
      </ul>

      {info.moves && (
        <>
          <h3 className="label mt-5 text-[9px] text-ink/45">Limits</h3>
          <div data-consent-limits className={`mt-2 grid gap-2 ${info.category === "trading" ? "grid-cols-3" : "grid-cols-2"}`}>
            {([["Per trade", `$${draft.perTxUsd}`], ["Daily", `$${draft.dailyUsd}`], ...(info.category === "trading" ? [["Slippage", pct(draft.maxSlippageBps)]] : [])] as [string, string][]).map(([k, v], i) => (
              <div key={k} className="row-in min-w-0 rounded-2xl bg-tint px-2.5 py-2" style={{ animationDelay: `${120 + i * 50}ms` }}><div className="truncate text-[11px] font-semibold text-ink/50">{k}</div><div className="tab-num text-[16px] font-bold text-ink">{v}</div></div>
            ))}
          </div>
          {onBack && <button onClick={onBack} className="mt-1.5 inline-flex h-8 items-center gap-1 rounded-full px-1 text-[12.5px] font-semibold text-brand-ink hover:opacity-80"><Icon name="edit" size={12} />Change limits</button>}
        </>
      )}

      <h3 className="label mt-5 text-[9px] text-ink/45">Agents</h3>
      <div data-consent-agents className="mt-1.5 flex flex-wrap gap-1.5">
        {draft.agents.length ? draft.agents.map((a) => <span key={a} className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-tint py-1 pl-1 pr-2.5 text-[13px] font-semibold text-ink"><AgentTile id={a} look={app?.agent?.look} size={22} status={false} ring={false} /><span className="truncate">{nameOf(a)}</span></span>)
          : <span className="text-[13px] text-ink/55">No agent picked yet.</span>}
      </div>

      <h3 className="label mt-5 text-[9px] text-ink/45">Access lasts</h3>
      <div data-consent-expiry className="mt-2 grid grid-cols-4 gap-1.5">
        {EXPIRY_DAYS.map((d) => <button key={d} type="button" data-days={d} aria-pressed={days === d} onClick={() => setDays(d)} className={`h-10 rounded-full text-[13px] font-bold transition ${days === d ? "bg-grape text-white shadow-[0_3px_0_var(--color-grape-deep)]" : "bg-tint text-ink/70 hover:text-ink"}`}>{expiryLabel(d)}</button>)}
      </div>
      <p className="mt-2 text-[12.5px] text-ink/55">Until <span key={days} className="price-in inline-block font-semibold text-ink/80">{until(days)}</span>. After that it switches off on its own.</p>

      <p className="mt-4 flex items-start gap-2 rounded-2xl bg-grape/8 px-3.5 py-3 text-[12.5px] leading-snug text-ink/70">
        <Icon name="lock" size={15} className="mt-px shrink-0 text-brand-ink" />
        {info.id === "hyperliquid" ? "Agents trade through a Hyperliquid API wallet that can place orders but can never withdraw. " : ""}
        {info.moves ? "Every action still waits for your Confirm in chat. " : ""}Switch it off anytime: anything still waiting for your Confirm is cancelled, and it shows in the audit log.
      </p>
    </IntSheet>
  );
}

const ago = (t: number) => {
  const s = Math.max(1, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(t).toLocaleDateString([], { month: "short", day: "numeric" });
};
export const AUDIT_KIND: Record<string, [string, string, "check" | "x" | "eye" | "clock" | "lock" | "edit" | "trash" | "stop"]> = {
  consent: ["Allowed", "bg-[#e7f8ee] text-[#137a3d]", "check"],
  change: ["Changed", "bg-tint text-ink/65", "edit"],
  revoke: ["Switched off", "bg-[#fde8e8] text-[#c53030]", "stop"],
  expire: ["Expired", "bg-tint text-ink/65", "clock"],
  remove: ["Removed", "bg-[#fde8e8] text-[#c53030]", "trash"],
  read: ["Read", "bg-tint text-ink/60", "eye"],
  confirmed: ["Confirmed", "bg-[#e7f8ee] text-[#137a3d]", "check"],
  pending: ["Waiting", "bg-[#fff6db] text-[#8a6100]", "clock"],
  denied: ["Blocked by a rule", "bg-[#fde8e8] text-[#c53030]", "lock"],
  cancelled: ["Cancelled", "bg-tint text-ink/60", "x"],
  failed: ["Failed", "bg-[#fde8e8] text-[#c53030]", "x"],
};

/** The audit log: every grant change you made and every call an agent made, with its decision. Exportable as CSV. */
export function AuditSheet({ connector, st, onClose }: { connector?: string; st: IntegrationsState; onClose: () => void }) {
  const [rows, setRows] = useState<AuditRow[] | null>(null);
  const [err, setErr] = useState("");
  const [more, setMore] = useState(true);
  const [busy, setBusy] = useState(false);
  const info = connector ? integrationById(connector) : undefined;
  useEffect(() => { loadAudit({ connector }).then((r) => { setRows(r); setMore(r.length >= 40); }).catch((e) => setErr(friendly(e))); }, [connector]);
  const next = async () => {
    if (!rows?.length) return;
    setBusy(true);
    try { const r = await loadAudit({ connector, before: rows[rows.length - 1].at }); setRows([...rows, ...r.filter((x) => !rows.some((y) => y.id === x.id))]); setMore(r.length >= 40); }
    catch (e) { toast({ text: friendly(e) }); } finally { setBusy(false); }
  };
  const nameOf = (slug?: string) => (slug ? st.agents.find((a) => a.slug === slug)?.name || "An agent" : "You");
  const csv = `/api/integrations/audit?format=csv${connector ? `&connector=${connector}` : ""}`;
  return (
    <IntSheet label="Audit log" onClose={onClose} head={
      <div className="flex items-start gap-3 px-5 pb-4 pt-3 sm:px-6 sm:pt-6 max-[430px]:px-4">
        {info ? <IntegrationLogo id={info.id} size={46} /> : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-grape text-white"><Icon name="list" size={21} /></span>}
        <div className="min-w-0 flex-1">
          <h2 className="display text-[24px] leading-[1.05] text-ink max-[430px]:text-[21px]">Audit log</h2>
          <p className="mt-1 text-[13px] leading-snug text-ink/60">{info ? `Everything that happened with ${info.name}.` : "Every access you gave and every call your agents made."}</p>
        </div>
        <a data-audit-csv href={csv} download className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-tint px-3 text-[13px] font-semibold text-ink hover:bg-ink/10"><Icon name="download" size={14} />CSV</a>
        <button onClick={onClose} aria-label="Close" className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-ink/70 hover:bg-tint"><Icon name="x" size={19} /></button>
      </div>
    }>
      {err ? <p className="py-6 text-center text-[14px] text-ink/60">{err}</p>
        : !rows ? <div aria-busy className="space-y-2 py-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-2xl bg-tint" />)}</div>
          : !rows.length ? (
            <div data-audit-empty className="grid place-items-center py-10 text-center">
              <span className="grid h-14 w-14 place-items-center rounded-[20px] bg-tint text-ink/50"><Icon name="list" size={22} /></span>
              <p className="mt-3 text-[15px] font-bold text-ink">Nothing yet</p>
              <p className="mt-1 text-[13px] text-ink/55">Access you give and every agent call show up here.</p>
            </div>
          ) : (
            <ol data-audit className="relative ml-1 border-l-2 border-line pl-5">
              {rows.map((r, i) => {
                const [label, chip, icon] = AUDIT_KIND[r.kind] || AUDIT_KIND.failed;
                return (
                  <li key={r.id} data-audit-row={r.kind} className="row-in relative py-2.5" style={{ animationDelay: `${Math.min(i, 12) * 35}ms` }}>
                    <span className={`absolute -left-[31px] top-3 grid h-5 w-5 place-items-center rounded-full ring-4 ring-[var(--card,#fff)] ${chip}`}><Icon name={icon} size={10} stroke={2.6} /></span>
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-semibold text-ink">{r.title}</div>
                        <div className="truncate text-[11.5px] text-ink/50">{!connector && `${integrationById(r.connector)?.name || r.connector} · `}{nameOf(r.agent)} · {ago(r.at)}</div>
                        {r.detail && <div className="mt-0.5 line-clamp-2 text-[12px] leading-snug text-ink/60">{r.detail}</div>}
                      </div>
                      {!!r.usd && <span className="tab-num shrink-0 text-[13px] font-bold text-ink">${r.usd.toFixed(2)}</span>}
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-bold ${chip}`}>{label}</span>
                      {r.explorer && <a href={r.explorer} target="_blank" rel="noreferrer" aria-label="View transaction" className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-ink/55 hover:bg-tint hover:text-ink"><Icon name="arrow" size={13} /></a>}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
      {rows && more && rows.length > 0 && <button onClick={() => void next()} disabled={busy} className="btn btn-line btn-sm mt-3 w-full text-ink">{busy ? "Loading…" : "Show older"}</button>}
    </IntSheet>
  );
}
